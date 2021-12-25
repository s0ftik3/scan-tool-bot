import { Composer } from "grammy";

import { Context } from "@bot/types";
import { usersService } from "@bot/services";
import { isBotAdmin, isPrivateChat } from "@bot/helpers/filters";
import { logger } from "@bot/logger";
import {
  DEFAULT_LANGUAGE_CODE,
  getGroupChatCommands,
  getPrivateChatCommands,
} from "@bot/helpers/bot-commands";
import { isMultipleLocales, locales } from "@bot/helpers/i18n";
import { config } from "@bot/config";

const baseComposer = new Composer<Context>();

export const composer = baseComposer.filter(isPrivateChat).filter(isBotAdmin);

composer.command("stats", async (ctx) => {
  logger.info({ msg: "handle stats", from: ctx.from, chat: ctx.chat });

  await ctx.replyWithChatAction("typing");

  const totalUsersCount = await usersService.getTotalCount();

  const stats = `Users count: ${totalUsersCount}`;

  return ctx.reply(stats);
});

composer.command("setcommands", async (ctx) => {
  logger.info({ msg: "handle setcommands", from: ctx.from, chat: ctx.chat });

  await ctx.replyWithChatAction("typing");

  // set private chat commands
  await ctx.api.setMyCommands(
    getPrivateChatCommands({
      localeCode: DEFAULT_LANGUAGE_CODE,
      includeLanguageCommand: isMultipleLocales,
    }),
    {
      scope: {
        type: "all_private_chats",
      },
    }
  );

  if (isMultipleLocales) {
    for (const code of locales) {
      await ctx.api.setMyCommands(
        getPrivateChatCommands({
          localeCode: code,
          includeLanguageCommand: isMultipleLocales,
        }),
        {
          language_code: code,
          scope: {
            type: "all_private_chats",
          },
        }
      );
    }
  }

  // set private chat admin commands
  await ctx.api.setMyCommands(
    [
      ...getPrivateChatCommands({
        localeCode: DEFAULT_LANGUAGE_CODE,
        includeLanguageCommand: isMultipleLocales,
      }),
      {
        command: "stats",
        description: "Stats",
      },
      {
        command: "setcommands",
        description: "Set bot commands",
      },
    ],
    {
      scope: {
        type: "chat",
        chat_id: config.BOT_ADMIN_USER_ID,
      },
    }
  );

  // set group chat commands
  await ctx.api.setMyCommands(
    getGroupChatCommands({
      localeCode: DEFAULT_LANGUAGE_CODE,
    }),
    {
      scope: {
        type: "all_group_chats",
      },
    }
  );

  return ctx.reply("Commands updated");
});