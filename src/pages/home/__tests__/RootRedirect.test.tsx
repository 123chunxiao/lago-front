import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'

import RootRedirect from '../RootRedirect'

const mockClient = {}
const mockLogOut = jest.fn()
const mockNavigate = jest.fn()
const mockUseLocation = jest.fn()
const mockUseCurrentUser = jest.fn()
const mockRefetchCurrentUserInfos = jest.fn()
const mockGetItemFromLS = jest.fn()
const mockGetPersistedOrganizationSlug = jest.fn()

jest.mock('@apollo/client', () => ({
  useApolloClient: () => mockClient,
}))

jest.mock('~/core/apolloClient', () => ({
  logOut: (...args: unknown[]) => mockLogOut(...args),
}))

// Stub the `~/core/router` barrel so the route modules (which pull in
// `envGlobalVar`) aren't traversed during the test.
jest.mock('~/core/router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(),
  FORBIDDEN_ROUTE: '/forbidden',
  LOGIN_ROUTE: '/login',
}))

jest.mock('~/core/utils/localStorage', () => ({
  getItemFromLS: (key: string) => mockGetItemFromLS(key),
}))

jest.mock('~/core/apolloClient/reactiveVars', () => ({
  getPersistedOrganizationSlug: () => mockGetPersistedOrganizationSlug(),
}))

jest.mock('~/hooks/useCurrentUser', () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}))

jest.mock('~/components/designSystem/Spinner', () => ({
  Spinner: () => null,
}))

const membership = (slug: string, accessibleByCurrentSession = true) => ({
  id: `membership-${slug}`,
  organization: { id: `id-${slug}`, slug, accessibleByCurrentSession },
})

describe('RootRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLocation.mockReturnValue({ state: null })
    mockGetItemFromLS.mockReturnValue(null)
    mockGetPersistedOrganizationSlug.mockReturnValue(null)
    mockUseCurrentUser.mockReturnValue({
      loading: false,
      error: undefined,
      currentUser: { memberships: [membership('acme'), membership('globex')] },
      refetchCurrentUserInfos: mockRefetchCurrentUserInfos,
    })
    mockLogOut.mockResolvedValue(undefined)
  })

  it('does nothing while the user is still loading', () => {
    mockUseCurrentUser.mockReturnValue({
      loading: true,
      currentUser: undefined,
      refetchCurrentUserInfos: mockRefetchCurrentUserInfos,
    })

    renderHook(() => RootRedirect())

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('falls back to the first accessible membership', () => {
    renderHook(() => RootRedirect())

    expect(mockNavigate).toHaveBeenCalledWith(
      '/acme',
      expect.objectContaining({ replace: true, skipSlugPrepend: true }),
    )
  })

  it('prefers the persisted last-used slug when it is an accessible membership', () => {
    mockGetPersistedOrganizationSlug.mockReturnValue('globex')

    renderHook(() => RootRedirect())

    expect(mockNavigate).toHaveBeenCalledWith('/globex', expect.objectContaining({ replace: true }))
  })

  it('prefers the saved `from` slug over the persisted/SSO slug', () => {
    mockUseLocation.mockReturnValue({ state: { from: { pathname: '/globex/customers/1' } } })
    mockGetPersistedOrganizationSlug.mockReturnValue('acme')

    renderHook(() => RootRedirect())

    expect(mockNavigate).toHaveBeenCalledWith('/globex', expect.objectContaining({ replace: true }))
  })

  it('uses the SSO redirect path slug when there is no saved `from`', () => {
    mockGetItemFromLS.mockReturnValue('/globex/analytics')

    renderHook(() => RootRedirect())

    expect(mockNavigate).toHaveBeenCalledWith('/globex', expect.objectContaining({ replace: true }))
  })

  it('ignores a persisted slug that is not an accessible membership', () => {
    mockGetPersistedOrganizationSlug.mockReturnValue('not-a-member')

    renderHook(() => RootRedirect())

    expect(mockNavigate).toHaveBeenCalledWith('/acme', expect.objectContaining({ replace: true }))
  })

  it('ignores memberships that are not accessible by the current session', () => {
    mockUseCurrentUser.mockReturnValue({
      loading: false,
      currentUser: { memberships: [membership('locked', false), membership('open')] },
    })

    renderHook(() => RootRedirect())

    expect(mockNavigate).toHaveBeenCalledWith('/open', expect.objectContaining({ replace: true }))
  })

  it('redirects to FORBIDDEN when there is no accessible membership', () => {
    mockUseCurrentUser.mockReturnValue({
      loading: false,
      currentUser: { memberships: [membership('locked', false)] },
    })

    renderHook(() => RootRedirect())

    expect(mockNavigate).toHaveBeenCalledWith('/forbidden', { replace: true })
  })

  it('shows recovery actions when the current user query fails', () => {
    mockUseCurrentUser.mockReturnValue({
      loading: false,
      error: new Error('network error'),
      currentUser: undefined,
      refetchCurrentUserInfos: mockRefetchCurrentUserInfos,
    })

    render(<RootRedirect />)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(mockRefetchCurrentUserInfos).toHaveBeenCalledTimes(1)
  })

  it('clears the session before returning to login', async () => {
    mockUseCurrentUser.mockReturnValue({
      loading: false,
      error: new Error('network error'),
      currentUser: undefined,
      refetchCurrentUserInfos: mockRefetchCurrentUserInfos,
    })

    render(<RootRedirect />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in again' }))

    await waitFor(() => {
      expect(mockLogOut).toHaveBeenCalledWith(mockClient, true)
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        replace: true,
        skipSlugPrepend: true,
      })
    })
  })

  it('forwards location.state on the bounce (so the saved `from` survives)', () => {
    const state = { from: { pathname: '/acme/customers/1' } }

    mockUseLocation.mockReturnValue({ state })

    renderHook(() => RootRedirect())

    expect(mockNavigate).toHaveBeenCalledWith(
      '/acme',
      expect.objectContaining({ state, replace: true }),
    )
  })
})
