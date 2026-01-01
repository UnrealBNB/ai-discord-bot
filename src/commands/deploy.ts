import { REST, Routes } from 'discord.js';
import { getCommands } from './index.js';
import 'dotenv/config';

const token = process.env['DISCORD_TOKEN'];
const clientId = process.env['DISCORD_CLIENT_ID'];

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment');
  process.exit(1);
}

const commands = getCommands();
const rest = new REST().setToken(token);

async function deploy() {
  try {
    console.log(`Deploying ${commands.length} application commands...`);

    const data = await rest.put(
      Routes.applicationCommands(clientId as string),
      { body: commands },
    );

    console.log(`Successfully deployed ${(data as unknown[]).length} application commands.`);
  } catch (error) {
    console.error('Error deploying commands:', error);
    process.exit(1);
  }
}

deploy();
