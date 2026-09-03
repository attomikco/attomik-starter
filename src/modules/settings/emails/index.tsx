import { notFound } from "next/navigation"
import { projectConfig } from "@/config/project"
import { emailBrand, rowToSkinInput, skins } from "@/core/branding"
import { emailPalettes, emailTemplates, renderTemplate, type EmailContext } from "@/core/email"
import { getAppEmailFrom } from "@/core/env"
import { pickLocale, resolveCopy } from "@/core/i18n"
import { isAdminLike, type Role } from "@/core/permissions"
import { brandingPublicUrl, requireWorkspace } from "@/core/workspace"
import { EmailsScreen, type EmailPreview } from "./emails-screen"

/**
 * Server entry for Settings → Emails. Renders every template in the
 * canonical catalog through the same `renderTemplate` the sends use, so
 * what this screen shows is the message a recipient receives — not a
 * mock-up of it.
 *
 * Two branding chains, because the product genuinely has two:
 *  - workspace-branded mail is sent from app code and carries the
 *    workspace's accent, logo and default locale;
 *  - project-branded mail is delivered by Supabase Auth from the static
 *    file in supabase/templates/, which has no workspace context.
 * Each preview says which chain it is on, so nobody reads a preview as a
 * promise the product does not keep.
 *
 * Owner/admin only, enforced here (the nav row is merely hidden).
 */
export default async function EmailsModule() {
  const { user, workspace, settings } = await requireWorkspace()
  const role = workspace.role as Role
  if (!isAdminLike(role)) notFound()

  const workspaceSkin = rowToSkinInput(settings)
  const workspaceLocale = pickLocale(settings.default_locale)
  const workspaceCtx: EmailContext = {
    locale: workspaceLocale,
    brandName: settings.display_name || workspace.name,
    logoUrl: brandingPublicUrl(settings.logo_light_path),
    palettes: emailPalettes({
      light: emailBrand(workspaceSkin, "light"),
      dark: emailBrand(workspaceSkin, "dark"),
    }),
  }

  const projectSkin = skins[projectConfig.skin]
  const projectCtx: EmailContext = {
    locale: projectConfig.locale,
    brandName: projectConfig.name,
    logoUrl: null,
    palettes: emailPalettes({
      light: emailBrand(projectSkin, "light"),
      dark: emailBrand(projectSkin, "dark"),
    }),
  }

  const appSender = getAppEmailFrom()

  const previews: EmailPreview[] = emailTemplates.map((def) => {
    const ctx = def.branding === "workspace" ? workspaceCtx : projectCtx

    // Stand-in values that are true where the product knows the truth: the
    // signed-in admin is who an invitation would come from, and role names
    // are the on-screen labels in the email's own locale.
    const vars: Record<string, string> = { ...def.previewVars }
    if (def.id === "invitation") {
      vars.inviterEmail = user.email
      vars.role = resolveCopy(ctx.locale).roles.labels[
        (["admin", "member", "viewer"].includes(settings.default_member_role)
          ? settings.default_member_role
          : "member") as Role
      ]
    }

    const light = renderTemplate(def, vars, ctx, "light")
    const dark = renderTemplate(def, vars, ctx, "dark")

    return {
      id: def.id,
      group: def.group,
      delivery: def.delivery,
      branding: def.branding,
      meta: def.meta.map(([label, value]) => [label, value] as [string, string]),
      subject: light.subject,
      preheader: light.preheader,
      blocks: light.blocks,
      text: light.text,
      html: { light: light.html, dark: dark.html },
      locale: ctx.locale,
      brandName: ctx.brandName,
      palettes: ctx.palettes,
      sender: def.delivery === "resend" ? appSender : "supabase/config.toml · auth.email.smtp",
    }
  })

  return <EmailsScreen previews={previews} />
}
