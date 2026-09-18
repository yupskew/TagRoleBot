# Tag Role Bot

A Discord bot that automatically assigns/removes a role when users display your server's **Server Tag** (Primary Guild).

## How It Works

1. A member displays your server's Server Tag → bot detects it → role assigned
2. Member removes/switches tag → bot detects it → role removed
3. Detection is real-time via Discord Gateway events (`GUILD_MEMBER_UPDATE` + `USER_UPDATE`)

### Eligibility Logic

```
user.primary_guild.identity_enabled === true
AND
user.primary_guild.identity_guild_id === YOUR_GUILD_ID
```

The guild ID is used as the source of truth, not the tag text.

## Setup

### 1. Create a Discord Application

1. Go to https://discord.com/developers/applications
2. Click **New Application** → name it → **Create**
3. Go to **Bot** tab → click **Reset Token** → copy the token
4. Go to **OAuth2** tab → copy the **Client ID**

### 2. Enable Required Gateway Intents

On the **Bot** tab:

1. Scroll to **Privileged Gateway Intents**
2. Enable:
   - **Server Members Intent** (`GUILD_MEMBERS`)
   - **Presence Intent** (`GUILD_PRESENCES`)
3. Click **Save Changes**

### 3. Create the Reward Role

1. In your Discord server, go to **Server Settings → Roles**
2. Create a new role (e.g., `@Server Tag`)
3. Set the role color, name, and permissions as desired
4. **Important:** The bot's role must be **higher** than this role in the role hierarchy
5. Right-click the role → **Copy Role ID** (requires Developer Mode)

### 4. Get IDs

- **Guild ID:** Right-click your server icon → **Copy Server ID**
- **Role ID:** Right-click the role → **Copy Role ID**

(Enable Developer Mode: User Settings → Advanced → Developer Mode)

### 5. Install

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
GUILD_ID=your_server_id_here
TAG_ROLE_ID=your_role_id_here
```

### 6. Deploy Commands

```bash
npm run deploy
```

### 7. Invite the Bot

Use this URL template (replace `CLIENT_ID`):

```
https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot%20applications.commands&permissions=268435456
```

The `permissions=268435456` grants **Manage Roles** permission.

Alternatively, generate the invite in the Discord Developer Portal under **OAuth2 → URL Generator**:
- Scopes: `bot`, `applications.commands`
- Bot Permissions: **Manage Roles**

### 8. Run

```bash
npm run dev    # development (hot reload)
npm run build  # compile TypeScript
npm start      # production
```

## Slash Commands

| Command | Permission | Description |
|---------|-----------|-------------|
| `/tag status` | Everyone | Shows your current tag and role status |
| `/tag sync` | Everyone | Immediately checks and syncs your role |
| `/tag check @user` | Admin | Inspects another member's tag status |
| `/tag sync-all` | Admin | Syncs all members in the server |

## Architecture

```
src/
  index.ts              — Client setup, event/command registration
  config.ts             — Environment variable validation
  commands/
    tag.ts              — Slash command definitions and handlers
  services/
    discordUser.ts      — Discord REST API user fetching with caching
    tagRoleManager.ts   — Role assignment/removal logic
    sync.ts             — Bulk sync with concurrency control
  events/
    ready.ts            — Bot ready handler, setup validation
    guildMemberAdd.ts   — New member tag check
    guildMemberUpdate.ts — Real-time tag change detection
  utils/
    logger.ts           — Timestamped structured logging
```

### Real-Time Detection

The bot listens for `Events.UserUpdate`, which fires when Discord detects a user property change (including `primary_guild`). This is triggered by the `GUILD_MEMBER_UPDATE` Gateway event. The bot compares old and new `primaryGuild` values and syncs the role only when the tag actually changes.

### Caching

User API responses are cached for 5 minutes to avoid redundant REST calls during rapid successive checks. The cache is invalidated when a tag change is detected.

### Rate Limit Handling

- Bulk sync processes 5 members per batch with 1-second delays between batches
- Retries on 429 (rate limited) with backoff
- One failed user does not abort the entire sync

## Requirements

- Node.js >= 20.0.0
- discord.js v14.18.0+
- A Discord bot with **Manage Roles** permission
- **Server Members Intent** and **Presence Intent** enabled

## Troubleshooting

**Bot doesn't respond to tag changes:**
- Verify Gateway Intents are enabled (Bot tab in Developer Portal)
- Check the bot has `Manage Roles` permission
- Ensure the bot's role is higher than the reward role in Server Settings → Roles

**"Configured role not found" error:**
- Verify `TAG_ROLE_ID` matches the role in your server
- Make sure the bot is in the same server as `GUILD_ID`

**Rate limiting:**
- For servers with 1000+ members, `/tag sync-all` will take several minutes
- This is normal — the bot processes in batches to respect rate limits

## License

MIT
