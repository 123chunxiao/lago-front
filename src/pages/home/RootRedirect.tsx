import { useApolloClient } from '@apollo/client'
import { useEffect, useRef } from 'react'

import { Spinner } from '~/components/designSystem/Spinner'
import { logOut } from '~/core/apolloClient'
import { getPersistedOrganizationSlug } from '~/core/apolloClient/reactiveVars'
import { FORBIDDEN_ROUTE, LOGIN_ROUTE, useLocation, useNavigate } from '~/core/router'
import { getItemFromLS } from '~/core/utils/localStorage'
import { REDIRECT_AFTER_LOGIN_LS_KEY } from '~/core/utils/localStorageKeys'
import { useCurrentUser } from '~/hooks/useCurrentUser'

/**
 * Root redirect hub (`/`), rendered OUTSIDE the `:organizationSlug` scope.
 *
 * Its only job is to resolve a landing org slug and redirect to `/${slug}`. It
 * performs NO org-scoped query and reads NO org-scoped data (permissions,
 * feature flags, premium addons) — at the root the auth header is null, so any
 * org-scoped query would be rejected by the backend. All of that is resolved by
 * the org-scoped `Home` (the `/:organizationSlug` index) once `OrganizationLayout`
 * has set the org context from the URL slug. Keeping the root org-data-free is
 * what makes the in-memory (non-LS-seeded) org var safe.
 *
 * Landing slug priority (each candidate validated against the user's accessible
 * memberships): slug of the saved `from` location → slug of the SSO redirect
 * path → persisted "last used" slug → first accessible membership.
 * `REDIRECT_AFTER_LOGIN_LS_KEY` is left untouched (the org-scoped `Home`
 * consumes it) and `location.state` is forwarded so the saved `from` survives
 * the bounce.
 */
const RootRedirect = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const client = useApolloClient()
  const {
    loading: isUserLoading,
    currentUser,
    error: currentUserError,
    refetchCurrentUserInfos,
  } = useCurrentUser()
  const hasNavigatedRef = useRef(false)

  useEffect(() => {
    if (isUserLoading || !currentUser) return
    if (hasNavigatedRef.current) return

    const accessibleMemberships = (currentUser.memberships || []).filter(
      (membership) => membership.organization.accessibleByCurrentSession,
    )

    if (!accessibleMemberships.length) {
      hasNavigatedRef.current = true
      navigate(FORBIDDEN_ROUTE, { replace: true })
      return
    }

    const isAccessibleSlug = (slug?: string): slug is string =>
      !!slug && accessibleMemberships.some((m) => m.organization.slug === slug)

    const routerState = location.state as { from?: { pathname?: string } } | null | undefined
    const savedSlug = routerState?.from?.pathname?.split('/')[1]
    const ssoSlug = (getItemFromLS(REDIRECT_AFTER_LOGIN_LS_KEY) || undefined)?.split('/')[1]
    const persistedSlug = getPersistedOrganizationSlug() || undefined

    const targetSlug =
      [savedSlug, ssoSlug, persistedSlug].find(isAccessibleSlug) ??
      accessibleMemberships[0].organization.slug

    hasNavigatedRef.current = true
    navigate(`/${targetSlug}`, { replace: true, state: location.state, skipSlugPrepend: true })
  }, [isUserLoading, currentUser, location.state, navigate])

  if (currentUserError || (!isUserLoading && !currentUser)) {
    const handleLogOut = async () => {
      await logOut(client, true)
      navigate(LOGIN_ROUTE, { replace: true, skipSlugPrepend: true })
    }

    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-lg font-semibold text-grey-700">Unable to load your account</h2>
        <p className="text-sm text-grey-600">Please retry or sign in again.</p>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            onClick={() => refetchCurrentUserInfos()}
          >
            Retry
          </button>
          <button
            type="button"
            className="rounded-md border border-grey-300 px-4 py-2 text-sm font-medium text-grey-700"
            onClick={handleLogOut}
          >
            Sign in again
          </button>
        </div>
      </div>
    )
  }

  return <Spinner />
}

export default RootRedirect
