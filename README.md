# AI Discord Moderator Bot

A production-ready Discord moderation bot powered by Google Gemini AI. Scans messages for scams, spam, and policy violations with configurable per-channel rules and custom AI prompts.

## Features

- **AI-Powered Scanning**: Uses Google Gemini to detect scams, phishing, spam, and policy violations
- **QR Code Detection**: Automatically scans images for QR codes and analyzes their content
- **Custom Prompts**: Configure AI prompts per situation type (scam, red packet, QR, generic)
- **Channel Policies**: Set specific moderation policies per channel
- **Whitelist Support**: Exempt roles and users from scanning
- **Manual Actions**: Review flagged content with action buttons (timeout, delete, warn)
- **Auto-Mode**: Optional automatic actions for high-confidence violations
- **Audit Logging**: Track all moderation actions in SQLite database
- **Rate Limiting**: Queue-based processing with retry logic for API limits

## Requirements

- Node.js 20+
- Discord Bot Token
- Google Gemini API Key (Free tier works)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-discord-bot
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment file and configure:
```bash
cp .env.example .env
```

4. Edit `.env` with your credentials:
```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
GEMINI_API_KEY=your_gemini_api_key
```

5. Deploy slash commands:
```bash
npm run deploy-commands
```

6. Start the bot:
```bash
npm run dev    # Development with hot reload
npm run build && npm start  # Production
```

## Discord Bot Setup

### Required Intents

Enable these in the Discord Developer Portal:
- Server Members Intent
- Message Content Intent

### Required Permissions

When inviting the bot, ensure these permissions:
- View Channels
- Send Messages
- Embed Links
- Read Message History
- Moderate Members
- Manage Messages

### Invite URL

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=1374389541958&scope=bot%20applications.commands
```

## Commands

All commands require Administrator permission.

### Basic Setup

```
/mod set-log-channel channel:#mod-log
/mod scan enable
```

### Scanning Control

| Command | Description |
|---------|-------------|
| `/mod scan enable` | Enable message scanning |
| `/mod scan disable` | Disable message scanning |
| `/mod scan status` | Check scanning status |

### Channel Policies

| Command | Description |
|---------|-------------|
| `/mod policy set channel:#channel type:RED_PACKET` | Set channel policy |
| `/mod policy remove channel:#channel type:RED_PACKET` | Remove policy |
| `/mod policy list` | List all policies |

**Policy Types:**
- `RED_PACKET` - Allow codes, forbid value mentions
- `LINK_ONLY` - Only allow links
- `NO_LINKS` - Forbid all links
- `STRICT` - Maximum scrutiny

### Whitelist

| Command | Description |
|---------|-------------|
| `/mod whitelist add type:role target:@Moderators` | Whitelist a role |
| `/mod whitelist add type:user target:@Username` | Whitelist a user |
| `/mod whitelist remove type:role target:@Moderators` | Remove from whitelist |
| `/mod whitelist list` | List all whitelisted |

### Custom Prompts

| Command | Description |
|---------|-------------|
| `/mod prompt set situation:SCAM_TEXT prompt:"..."` | Set custom prompt |
| `/mod prompt view situation:SCAM_TEXT` | View current prompt |
| `/mod prompt reset situation:SCAM_TEXT` | Reset to default |
| `/mod prompt list` | List all prompts |

**Situation Types:**
- `SCAM_TEXT` - Text scam/phishing detection
- `RED_PACKET_POLICY` - Red packet channel moderation
- `IMAGE_QR` - QR code threat analysis
- `GENERIC_MODERATION` - General policy violations

### Auto-Mode

| Command | Description |
|---------|-------------|
| `/mod automode enable` | Enable automatic actions |
| `/mod automode disable` | Disable automatic actions |
| `/mod automode status` | Check auto-mode status |

Auto-mode only triggers for:
- Score >= 80
- Confidence >= 85%
- False positive risk = low

### Rules

| Command | Description |
|---------|-------------|
| `/mod rules add name:scam-link regex:bit\.ly severity:80` | Add rule |
| `/mod rules remove name:scam-link` | Remove rule |
| `/mod rules list` | List all rules |

## Architecture

```
src/
├── index.ts              # Entry point
├── config.ts             # Environment config
├── commands/             # Slash command handlers
│   └── mod/              # /mod subcommands
├── events/               # Discord event handlers
├── modules/
│   ├── scanner/          # Message scanning pipeline
│   ├── qr/               # QR code detection
│   └── actions/          # Moderation actions
├── services/
│   ├── gemini/           # AI integration
│   └── queue/            # Rate-limited queue
├── db/                   # SQLite repositories
├── ui/                   # Embeds and buttons
└── utils/                # Logging, permissions, etc.
```

## Database

SQLite database stored at `./data/bot.db` (configurable).

**Tables:**
- `guild_config` - Per-guild settings
- `channel_policies` - Channel-specific policies
- `rules` - Custom regex rules
- `whitelist_roles` / `whitelist_users` - Scan exemptions
- `situation_prompts` - Custom AI prompts
- `actions_audit_log` - Moderation history

## AI Response Schema

Gemini returns JSON with this structure:

```json
{
  "score": 0-100,
  "categories": ["investment_scam", "phishing", ...],
  "explanation": "Brief analysis",
  "recommended_action": "none|log_only|warn_dm|delete|timeout|timeout_and_delete",
  "confidence": 0.0-1.0,
  "false_positive_risk": "low|medium|high",
  "evidence": [{"type": "pattern|url|qr", "value": "..."}]
}
```

## Testing

```bash
npm test           # Run tests
npm run test:run   # Run once (CI)
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_TOKEN` | Yes | - | Bot token |
| `DISCORD_CLIENT_ID` | Yes | - | Application ID |
| `GEMINI_API_KEY` | Yes | - | Gemini API key |
| `GEMINI_MODEL` | No | `gemini-1.5-flash` | Model to use |
| `DATABASE_PATH` | No | `./data/bot.db` | SQLite path |
| `LOG_LEVEL` | No | `info` | Logging level |
| `MAX_CONCURRENCY` | No | `2` | Queue concurrency |
| `MAX_QUEUE_SIZE` | No | `500` | Max queue size |
| `MAX_IMAGE_SIZE_MB` | No | `8` | Max image size |
| `IMAGE_DOWNLOAD_TIMEOUT_MS` | No | `10000` | Download timeout |

## Security Notes

- Never commit `.env` files
- Bot tokens and API keys should be kept secret
- The bot only stores message IDs, not full content
- Minimal data is sent to Gemini (snippets, URLs, QR content)
- Secrets are automatically redacted from logs

## License

MIT
