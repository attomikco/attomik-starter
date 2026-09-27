import { getT } from "@/core/i18n/server"
import { customersCopy } from "./copy"

export default async function CustomersModule() {
  const t = await getT(customersCopy)
  return (
    <div style={{ padding: 26 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: "var(--w-bold)" as never, letterSpacing: "-0.02em" }}>{t("customers.placeholder.title")}</h1>
      <p style={{ color: "var(--txt-2)", fontSize: 14 }}>{t("customers.placeholder.body")}</p>
    </div>
  )
}
