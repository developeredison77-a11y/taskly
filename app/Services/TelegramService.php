<?php

namespace App\Services;

use App\Models\NotificationTemplate;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    public static function send($templateName, $data = [], $userId = null)
    {
        $userId = $userId ?: auth()->id();

        if (!$userId) {
            return false;
        }

        // Check if template exists and is of type 'telegram'
        $template = NotificationTemplate::where('name', $templateName)
            ->where('type', 'telegram')
            ->first();
        if (!$template) {
            return false;
        }
        if (!\App\Models\UserNotificationTemplate::isNotificationActive($templateName, $userId, 'telegram')) {
            return false;
        }

        $botToken = getSetting('telegram_bot_token', '', $userId);
        $chatId = getSetting('telegram_chat_id', '', $userId);
        
        if (!$botToken || !$chatId) {
            return false;
        }

        $message = self::formatMessage($templateName, $data);

        $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
        
        $payload = [
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => true
        ];

        $jsonPayload = json_encode($payload);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($jsonPayload)
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        return $httpCode === 200 && empty($curlError);
    }

    private static function formatMessage($templateName, $data)
    {
        $title = $data['title'] ?? ucfirst(str_replace('_', ' ', $templateName));
        $message = $data['message'] ?? 'New notification from Taskly';

        $formatted = "<b>{$title}</b>\n\n{$message}";

        if (isset($data['url'])) {
            $formatted .= "\n\n<a href='{$data['url']}'>View Details</a>";
        }

        return $formatted;
    }
    public function sendTemplateMessageToChat(string $templateName, array $variables, string $chatId, string $language = 'en', int $userId = null)
    {
        try {
            // Check if Telegram notification is enabled for this template
            if (!$this->isTelegramNotificationEnabled($templateName)) {
                return false;
            }

            // Get notification template with type check
            $template = NotificationTemplate::where('name', $templateName)
                ->where('type', 'telegram')
                ->first();

            if (!$template) {
                throw new Exception("Notification template '{$templateName}' not found");
            }

            // Get template content for the specified language
            $templateLang = $template->notificationTemplateLangs()
                ->where('lang', $language)
                ->where('created_by', createdBy())
                ->first();

            // Fallback to English if language not found
            if (!$templateLang) {
                $templateLang = $template->notificationTemplateLangs()
                    ->where('lang', 'en')
                    ->where('created_by', createdBy())
                    ->first();
            }

            if (!$templateLang) {
                throw new Exception("No content found for template '{$templateName}'");
            }

            // Replace variables in content
            $message = $this->replaceVariables($templateLang->content, $variables);

            // Send message to specified chat
            return $this->sendMessage($chatId, $message);
        } catch (Exception $e) {
            \Log::error('Telegram message sending failed: ' . $e->getMessage());
            session()->flash('telegram_error', $e->getMessage());
            return false;
        }
    }

    private function replaceVariables(string $content, array $variables): string
    {
        return str_replace(array_keys($variables), array_values($variables), $content);
    }

    private function isTelegramNotificationEnabled(string $templateName): bool
    {
        return isNotificationTemplateEnabled($templateName, createdBy(), 'telegram');
    }

    private function getNotificationChatId(int $userId = null): ?string
    {
        $userId = $userId ?: createdBy();

        // Get chat ID from settings
        $chatId = getSetting('telegram_chat_id', null, $userId);
        if ($chatId) {
            return $chatId;
        }

        // No chat ID available
        return null;
    }

    private function sendMessage(string $chatId, string $message): bool
    {
        $botToken = getSetting('telegram_bot_token', '', createdBy());
        $telegramChatId = getSetting('telegram_chat_id', '', createdBy());

        if (!$botToken || !$telegramChatId) {
            throw new Exception("Telegram settings not configured. Please configure Telegram bot token and chat ID.");
        }

        $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
        
        $data = [
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => true
        ];

        $jsonPayload = json_encode($data);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($jsonPayload)
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        return $httpCode === 200 && empty($curlError);
    }

    public function sendTestMessage(string $botToken, string $chatId): bool
    {
        $message = '🤖 <b>Test Message from Taskly</b>\n\nThis is a test message to verify your Telegram integration is working correctly.\n\nIf you can see this message, your bot configuration is successful! 🎉';
        
        $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
        
        $data = [
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'HTML'
        ];

        $jsonPayload = json_encode($data);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($jsonPayload)
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        return $httpCode === 200 && empty($curlError);
    }

    public function getBotInfo($botToken)
    {
        $url = "https://api.telegram.org/bot{$botToken}/getMe";
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($httpCode === 200 && empty($curlError)) {
            return json_decode($response, true);
        }
        
        return null;
    }
}