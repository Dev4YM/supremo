import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { WorkflowContext } from '../automation/interfaces/action.interface';
import { PlaceholderService } from '../automation/placeholder.service';

@Injectable()
export class MessageBuilderService {
  constructor(
    @Inject(forwardRef(() => PlaceholderService))
    private placeholderService: PlaceholderService,
  ) {}

  interpolate(template: string, context: WorkflowContext): string {
    // Use PlaceholderService for centralized interpolation
    return this.placeholderService.interpolate(template, context);
  }

  async buildEmbed(config: any, context: WorkflowContext): Promise<any> {
    const embed = new EmbedBuilder();

    if (config.title) {
      embed.setTitle(this.interpolate(config.title, context));
    }

    if (config.description) {
      embed.setDescription(this.interpolate(config.description, context));
    }

    if (config.color) {
      const color = typeof config.color === 'string' 
        ? parseInt(config.color.replace('#', ''), 16) 
        : config.color;
      embed.setColor(color);
    }

    if (config.fields && Array.isArray(config.fields)) {
      config.fields.forEach((field: any) => {
        embed.addFields({
          name: this.interpolate(field.name || '', context),
          value: this.interpolate(field.value || '', context),
          inline: field.inline !== undefined ? field.inline : false,
        });
      });
    }

    if (config.image) {
      embed.setImage(this.interpolate(config.image, context));
    }

    if (config.thumbnail) {
      embed.setThumbnail(this.interpolate(config.thumbnail, context));
    }

    if (config.footer) {
      embed.setFooter({
        text: this.interpolate(config.footer.text || '', context),
        iconURL: config.footer.iconURL ? this.interpolate(config.footer.iconURL, context) : undefined,
      });
    }

    if (config.timestamp) {
      embed.setTimestamp(config.timestamp === true ? new Date() : new Date(config.timestamp));
    }

    if (config.author) {
      embed.setAuthor({
        name: this.interpolate(config.author.name || '', context),
        iconURL: config.author.iconURL ? this.interpolate(config.author.iconURL, context) : undefined,
        url: config.author.url ? this.interpolate(config.author.url, context) : undefined,
      });
    }

    if (config.url) {
      embed.setURL(this.interpolate(config.url, context));
    }

    return { embeds: [embed] };
  }

  async buildInteractive(
    content: string,
    components: any[],
    context: WorkflowContext,
  ): Promise<any> {
    const rows: ActionRowBuilder<any>[] = [];

    components.forEach((component: any) => {
      if (component.type === 'button') {
        const row = new ActionRowBuilder<ButtonBuilder>();
        const buttons = Array.isArray(component.buttons) ? component.buttons : [component];

        buttons.forEach((btn: any) => {
          const button = new ButtonBuilder()
            .setLabel(this.interpolate(btn.label || '', context))
            .setCustomId(btn.customId || `btn_${Date.now()}`);

          if (btn.style) {
            const styleMap: Record<string, ButtonStyle> = {
              primary: ButtonStyle.Primary,
              secondary: ButtonStyle.Secondary,
              success: ButtonStyle.Success,
              danger: ButtonStyle.Danger,
              link: ButtonStyle.Link,
            };
            button.setStyle(styleMap[btn.style] || ButtonStyle.Primary);
          }

          if (btn.url) {
            button.setURL(this.interpolate(btn.url, context));
            button.setStyle(ButtonStyle.Link);
          }

          if (btn.emoji) {
            button.setEmoji(btn.emoji);
          }

          if (btn.disabled) {
            button.setDisabled(true);
          }

          row.addComponents(button);
        });

        rows.push(row);
      } else if (component.type === 'select') {
        const row = new ActionRowBuilder<StringSelectMenuBuilder>();
        const select = new StringSelectMenuBuilder()
          .setCustomId(component.customId || `select_${Date.now()}`)
          .setPlaceholder(this.interpolate(component.placeholder || 'Select an option...', context));

        if (component.options && Array.isArray(component.options)) {
          component.options.forEach((opt: any) => {
            select.addOptions({
              label: this.interpolate(opt.label || '', context),
              value: opt.value || opt.label,
              description: opt.description ? this.interpolate(opt.description, context) : undefined,
              emoji: opt.emoji,
            });
          });
        }

        row.addComponents(select);
        rows.push(row);
      }
    });

    return {
      content: content || undefined,
      components: rows,
    };
  }
}

