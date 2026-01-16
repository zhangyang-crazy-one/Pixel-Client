fn main() {
    // TypeScript type generation is configured via #[ts(export)] attributes in state.rs
    // ts-rs will automatically generate .ts files during compilation

    println!("cargo:rerun-if-changed=resources/syntaxes");
    println!("cargo:rerun-if-changed=resources/themes");
    println!("cargo:rerun-if-changed=src/types");
}
