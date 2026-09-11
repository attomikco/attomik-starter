import { requireUser } from "@/core/auth/require-user"
import { getOwnProfile } from "@/core/profile"
import { ProfileScreen } from "./profile-screen"

/** Server entry: a person's own name, photo, and email. */
export default async function ProfileModule() {
  const [user, profile] = await Promise.all([requireUser(), getOwnProfile()])

  return (
    <ProfileScreen
      initial={{
        displayName: profile.displayName ?? "",
        email: user.email,
        avatarUrl: profile.avatarUrl,
      }}
    />
  )
}
