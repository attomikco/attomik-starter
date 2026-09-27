import { getT } from "@/core/i18n/server"
import { mediaCopy } from "./copy"

export default async function MediaModule() {
  const t = await getT(mediaCopy)
  return (
    <div style={{ padding: 26 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em" }}>{t("media.placeholder.title")}</h1>
      <p style={{ color: "var(--txt-2)", fontSize: 14 }}>{t("media.placeholder.body")}</p>
    </div>
  )
}
