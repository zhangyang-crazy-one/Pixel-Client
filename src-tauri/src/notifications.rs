// Notification manager for Tauri desktop notifications
// Uses tauri-plugin-notification for cross-platform notification support

use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

/// Manages desktop notifications for the Tauri application
pub struct NotificationManager {
    app: AppHandle,
}

impl NotificationManager {
    /// Creates a new notification manager instance
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }

    /// Sends a desktop notification with the given title and body
    ///
    /// # Arguments
    /// * `title` - The notification title
    /// * `body` - The notification message body
    ///
    /// # Returns
    /// Result indicating success or an error message
    pub fn send_notification(&self, title: &str, body: &str) -> Result<(), String> {
        self.app
            .notification()
            .builder()
            .title(title)
            .body(body)
            .show()
            .map_err(|e| e.to_string())
    }
}
