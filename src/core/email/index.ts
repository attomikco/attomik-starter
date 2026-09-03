export type { EmailBlock } from "./blocks.ts"
export { esc, strong, blockNames } from "./blocks.ts"
export type { EmailPalette, EmailBrandPair } from "./palette.ts"
export { LIGHT_EMAIL_PALETTE, DARK_EMAIL_PALETTE, emailPalettes } from "./palette.ts"
export type { EmailFooter, RenderEmailInput } from "./render.ts"
export { renderEmail } from "./render.ts"
export { renderText } from "./text.ts"
export type {
  EmailTemplateId,
  EmailGroup,
  EmailContext,
  BuiltEmail,
  EmailTemplateDefinition,
  RenderedEmail,
} from "./templates.ts"
export {
  emailTemplates,
  emailTemplate,
  renderTemplate,
  MAGIC_LINK_TTL_MINUTES,
} from "./templates.ts"
