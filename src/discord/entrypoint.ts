import { Client, Events, GatewayIntentBits } from 'discord.js';
import { ClientInstance } from './client';
import { CommandManager } from './command-manager';
import { ENV_LIST } from '../../infra/env-config';
import { KeywordCommandController } from './controller/keyword-command.controller';

const { Guilds, GuildMessages } = GatewayIntentBits;
export class DiscordEntryPoint {
    constructor(
        private keywordCommandController: KeywordCommandController,
        private readonly commandManager: CommandManager,
        private readonly discordClient: Client
    ) {
        this.discordClient = ClientInstance.getClient({
            intents: [Guilds, GuildMessages],
        });
    }

    public async startClient() {
        try {
            const slashCommandSet =
                await this.commandManager.enrollCommandAndGetCommandCollection();

            this.discordClient.on(
                Events.InteractionCreate,
                async (interaction) => {
                    if (interaction.isChatInputCommand()) {
                        const command = slashCommandSet.get(
                            interaction.commandName
                        );

                        if (!command) {
                            throw new Error(
                                `No command matching ${interaction.commandName} was found`
                            );
                        }
                        await command.execute(interaction);
                    }

                    if (
                        interaction.isStringSelectMenu() &&
                        interaction.customId === 'keyword-management-command'
                    ) {
                        const value = interaction.values[0];

                        if (value === 'retrieve') {
                            await this.keywordCommandController.getKeywordByUserId(
                                interaction
                            );
                        }

                        if (value === 'insert') {
                            await this.keywordCommandController.showModalFormToInsertKeywords(
                                interaction
                            );
                        }

                        if (value === 'delete') {
                            await this.keywordCommandController.showModalFormToDeleteKeywords(
                                interaction
                            );
                        }
                    }

                    if (
                        interaction.isModalSubmit() &&
                        interaction.customId === 'keyword-input-modal'
                    ) {
                        const validKeywords = interaction.fields.fields
                            .map((modalInput) => modalInput.value)
                            .filter(
                                (keywordOrEmptyString) =>
                                    keywordOrEmptyString !== ''
                            );
                        await this.keywordCommandController.insertKeywordsWithUserId(
                            validKeywords,
                            interaction
                        );
                    }

                    if (
                        interaction.isStringSelectMenu() &&
                        interaction.customId === 'keyword-view-modal-for-delete'
                    ) {
                        const keywordHashesToDelete = interaction.values;

                        await this.keywordCommandController.deleteKeywordWithUserId(
                            keywordHashesToDelete,
                            interaction
                        );
                    }
                }
            );
        } catch (e) {
            throw e;
        } finally {
            await this.discordClient.login(ENV_LIST.DISCORD_TOKEN);
        }
    }
}
