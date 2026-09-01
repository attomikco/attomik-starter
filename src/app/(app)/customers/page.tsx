import { requireModule } from "@/core/modules"
import CustomersModule from "@/modules/customers"

export default function CustomersPage() {
  requireModule("customers")

  return <CustomersModule />
}
