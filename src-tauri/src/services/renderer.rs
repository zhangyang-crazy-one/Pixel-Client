//! Markdown rendering service with syntax highlighting
//! Uses pulldown-cmark for Markdown parsing and syntect for code highlighting

use pulldown_cmark::{Options, Parser, Event, Tag, CodeBlockKind, TagEnd};
use syntect::html::start_highlighted_html_snippet;
use syntect::highlighting::ThemeSet;
use syntect::parsing::SyntaxSet;
use once_cell::sync::Lazy;
use std::collections::HashMap;

/// Pre-loaded syntax definitions
static SYNTAX_SET: Lazy<SyntaxSet> = Lazy::new(SyntaxSet::load_defaults_nonewlines);

/// Pre-loaded themes
static THEME_SET: Lazy<ThemeSet> = Lazy::new(ThemeSet::load_defaults);

/// Default theme name
const DEFAULT_THEME: &str = "base16-ocean.dark";

/// Language alias mappings for common names
static LANGUAGE_ALIASES: Lazy<HashMap<String, String>> = Lazy::new(|| {
    let mut map = HashMap::new();
    map.insert("js".to_string(), "javascript".to_string());
    map.insert("ts".to_string(), "typescript".to_string());
    map.insert("py".to_string(), "python".to_string());
    map.insert("rs".to_string(), "rust".to_string());
    map.insert("rb".to_string(), "ruby".to_string());
    map.insert("yml".to_string(), "yaml".to_string());
    map.insert("sh".to_string(), "bash".to_string());
    map.insert("bash".to_string(), "bash".to_string());
    map.insert("zsh".to_string(), "bash".to_string());
    map.insert("json".to_string(), "json".to_string());
    map.insert("html".to_string(), "html".to_string());
    map.insert("css".to_string(), "css".to_string());
    map.insert("cpp".to_string(), "c++".to_string());
    map.insert("cxx".to_string(), "c++".to_string());
    map.insert("h".to_string(), "c".to_string());
    map.insert("hpp".to_string(), "c++".to_string());
    map.insert("java".to_string(), "java".to_string());
    map.insert("kt".to_string(), "kotlin".to_string());
    map.insert("go".to_string(), "go".to_string());
    map.insert("rust".to_string(), "rust".to_string());
    map.insert("sql".to_string(), "sql".to_string());
    map.insert("xml".to_string(), "xml".to_string());
    map.insert("md".to_string(), "markdown".to_string());
    map.insert("markdown".to_string(), "markdown".to_string());
    map
});

/// Render Markdown to HTML with syntax highlighting
#[tauri::command]
pub fn render_markdown(markdown_input: String) -> Result<String, String> {
    let parser = Parser::new_ext(&markdown_input, get_markdown_options());
    
    let mut html_output = String::with_capacity(markdown_input.len() * 2);
    let mut events: Vec<Event> = parser.collect();
    
    process_markdown_events(&mut events, &mut html_output);
    
    Ok(html_output)
}

/// Get markdown parsing options
fn get_markdown_options() -> Options {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_HEADING_ATTRIBUTES);
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_SMART_PUNCTUATION);
    options
}

/// Process markdown events with code highlighting
fn process_markdown_events(events: &mut [Event], output: &mut String) {
    let mut in_code_block = false;
    let mut current_lang = String::new();
    let mut current_code = String::new();
    let mut last_event_was_code = false;
    
    for event in events.iter() {
        match event {
            Event::Start(Tag::CodeBlock(kind)) => {
                in_code_block = true;
                current_lang = match kind {
                    CodeBlockKind::Fenced(info) => {
                        let info_str = info.to_string();
                        info_str.split_whitespace().next()
                            .map(|s| s.to_string())
                            .unwrap_or_default()
                    }
                    CodeBlockKind::Indented => "text".to_string(),
                };
                current_code.clear();
                last_event_was_code = true;
            }
            Event::Text(text) => {
                if in_code_block {
                    current_code.push_str(text);
                } else {
                    if last_event_was_code {
                        let highlighted = highlight_code(&current_lang, &current_code);
                        output.push_str(&highlighted);
                        in_code_block = false;
                        last_event_was_code = false;
                    } else {
                        let escaped = escape_html(text);
                        output.push_str(&escaped);
                    }
                }
            }
            Event::End(TagEnd::CodeBlock) => {
                if !current_code.is_empty() && in_code_block {
                    let highlighted = highlight_code(&current_lang, &current_code);
                    output.push_str(&highlighted);
                }
                in_code_block = false;
                last_event_was_code = false;
            }
            Event::Start(tag) => {
                if last_event_was_code && !in_code_block {
                } else {
                    push_tag(output, tag);
                }
                last_event_was_code = false;
            }
            Event::End(tag_end) => {
                if !matches!(tag_end, TagEnd::CodeBlock) {
                    push_tag_end(output, tag_end);
                }
                last_event_was_code = false;
            }
            Event::SoftBreak => {
                output.push_str(" ");
            }
            Event::HardBreak => {
                output.push_str("\n");
            }
            Event::Rule => {
                output.push_str("<hr />\n");
            }
            _ => {
                last_event_was_code = false;
            }
        }
    }
}

/// Highlight code using syntect
fn highlight_code(language: &str, code: &str) -> String {
    let lang = LANGUAGE_ALIASES
        .get(language.to_lowercase().as_str())
        .map(|s| s.as_str())
        .unwrap_or(language);
    
    let syntax = if lang.is_empty() {
        SYNTAX_SET.find_syntax_by_extension("txt")
    } else {
        SYNTAX_SET.find_syntax_by_token(lang)
    };
    
    let syntax = match syntax {
        Some(s) => s,
        None => SYNTAX_SET.find_syntax_by_extension("txt")
            .unwrap_or_else(|| SYNTAX_SET.syntaxes().first().unwrap()),
    };
    
    let theme = THEME_SET.themes.get(DEFAULT_THEME)
        .or_else(|| THEME_SET.themes.values().next())
        .unwrap_or_else(|| &THEME_SET.themes[DEFAULT_THEME]);
    
    // syntect 5.0 API: start_highlighted_html_snippet(theme) -> (html, styles)
    let (highlighted_html, _) = start_highlighted_html_snippet(theme);
    
    format!(
        r#"<div class="code-block" data-language="{}"><pre class="syntect">{}</pre></div>"#,
        escape_html(language),
        highlighted_html
    )
}

/// HTML escape for plain text
fn escape_html(text: &str) -> String {
    html_escape::encode_safe(text).to_string()
}

/// Push HTML tag start
fn push_tag(output: &mut String, tag: &Tag) {
    match tag {
        Tag::Paragraph => output.push_str("<p>"),
        Tag::Heading { level: _, id: _, classes: _, attrs: _ } => {
            output.push_str("<h>");
        }
        Tag::BlockQuote => output.push_str("<blockquote>"),
        Tag::CodeBlock(_) => {
            output.push_str("<pre><code>");
        }
        Tag::List(_) => output.push_str("<ul>"),
        Tag::Item => output.push_str("<li>"),
        Tag::Emphasis => output.push_str("<em>"),
        Tag::Strong => output.push_str("<strong>"),
        Tag::Strikethrough => output.push_str("<del>"),
        Tag::Link { dest_url, title: _, id: _ } => {
            output.push_str("<a href=\"");
            output.push_str(&escape_html(dest_url));
            output.push_str("\">");
        }
        Tag::Image { dest_url, title: _, id: _ } => {
            output.push_str("<img src=\"");
            output.push_str(&escape_html(dest_url));
            output.push_str("\" />");
        }
        Tag::Table(_) => {
            output.push_str("<table><thead><tr>");
        }
        Tag::TableHead => {
            output.push_str("</tr></thead><tbody>");
        }
        Tag::TableRow => output.push_str("<tr>"),
        Tag::TableCell => output.push_str("<td>"),
        Tag::FootnoteDefinition(_) => output.push_str("<footnote>"),
        _ => {}
    }
}

/// Push HTML tag end
fn push_tag_end(output: &mut String, tag_end: &TagEnd) {
    match tag_end {
        TagEnd::Paragraph => output.push_str("</p>"),
        TagEnd::Heading { level: _, id: _, classes: _, attrs: _ } => {
            output.push_str("</h>");
        }
        TagEnd::BlockQuote => output.push_str("</blockquote>"),
        TagEnd::CodeBlock => output.push_str("</code></pre>"),
        TagEnd::List(_) => output.push_str("</ul>"),
        TagEnd::Item => output.push_str("</li>"),
        TagEnd::Emphasis => output.push_str("</em>"),
        TagEnd::Strong => output.push_str("</strong>"),
        TagEnd::Strikethrough => output.push_str("</del>"),
        TagEnd::Link => output.push_str("</a>"),
        TagEnd::Image => {}
        TagEnd::Table => output.push_str("</tbody></table>"),
        TagEnd::TableHead => output.push_str("</tr></thead>"),
        TagEnd::TableRow => output.push_str("</tr>"),
        TagEnd::TableCell => output.push_str("</td>"),
        TagEnd::FootnoteDefinition => output.push_str("</footnote>"),
        _ => {}
    }
}

/// Process custom markdown extensions (thinking tags, tool actions)
#[tauri::command]
pub fn process_custom_syntax(markdown_input: String) -> Result<String, String> {
    let mut result = markdown_input;
    
    if let Some(start) = result.find("<thinking>") {
        if let Some(end) = result[start..].find("</thinking>") {
            let content_start = start + 10;
            let content_end = start + end;
            let content = &result[content_start..content_end];
            result.replace_range(
                start..=content_end + 11,
                &format!(r#"<details class="thinking-block"><summary>Thinking...</summary><div class="thinking-content">{}</div></details>"#, content)
            );
        }
    }
    
    Ok(result)
}

/// Highlight code synchronously (for non-Tauri use)
#[tauri::command]
pub fn highlight_code_sync(code: String, language: String) -> Result<String, String> {
    Ok(highlight_code(&language, &code))
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_render_markdown() {
        let md = "# Hello\n\nThis is **bold** and *italic*.\n\n```rust\nfn main() {\n    println!(\"Hello\");\n}\n```".to_string();
        let result = render_markdown(md).unwrap();
        assert!(result.contains("<h"));
        assert!(result.contains("<strong>"));
        assert!(result.contains("code-block"));
    }
    
    #[test]
    fn test_escape_html() {
        let input = "<script>alert('xss')</script>";
        let result = escape_html(input);
        assert!(!result.contains("<script>"));
        assert!(result.contains("&lt;script&gt;"));
    }
}
