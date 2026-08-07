import { gql, useQuery } from '@apollo/client'
import { Icon } from 'lago-design-system'
import { useMemo, useRef } from 'react'
import { generatePath, useParams } from 'react-router-dom'

import { Alert } from '~/components/designSystem/Alert'
import { Button } from '~/components/designSystem/Button'
import { Tooltip } from '~/components/designSystem/Tooltip'
import { Typography } from '~/components/designSystem/Typography'
import { IntegrationsPage } from '~/components/layouts/Integrations'
import { MainHeader } from '~/components/MainHeader/MainHeader'
import {
  AddAppleIapDialog,
  AddAppleIapDialogRef,
  APPLE_IAP_PROVIDER_FIELDS,
  AppleIapProvider,
} from '~/components/settings/integrations/AddAppleIapDialog'
import { useDeleteAppleIapIntegrationDialog } from '~/components/settings/integrations/DeleteAppleIapIntegrationDialog'
import { addToast, envGlobalVar } from '~/core/apolloClient'
import { IntegrationsTabsOptionsEnum } from '~/core/constants/tabsOptions'
import { APPLE_IAP_INTEGRATION_ROUTE, INTEGRATIONS_ROUTE, useNavigate } from '~/core/router'
import { copyToClipboard } from '~/core/utils/copyToClipboard'
import { useInternationalization } from '~/hooks/core/useInternationalization'
import { useCurrentUser } from '~/hooks/useCurrentUser'
import { usePermissions } from '~/hooks/usePermissions'
import AppleIap from '~/public/images/apple-iap.svg'

const GET_APPLE_IAP_INTEGRATION_DETAILS = gql`
  query getAppleIapIntegrationDetails($id: ID!) {
    paymentProvider(id: $id) {
      ... on AppleIapProvider {
        ...AppleIapProviderFields
      }
    }
  }
  ${APPLE_IAP_PROVIDER_FIELDS}
`

const AppleIapIntegrationDetails = () => {
  const navigate = useNavigate()
  const { integrationId } = useParams()
  const { hasPermissions } = usePermissions()
  const addDialogRef = useRef<AddAppleIapDialogRef>(null)
  const { openDeleteAppleIapIntegrationDialog } = useDeleteAppleIapIntegrationDialog()
  const { apiUrl } = envGlobalVar()
  const { currentMembership } = useCurrentUser()
  const { translate } = useInternationalization()
  const organizationId = currentMembership?.organization.id || ''
  const { data, loading } = useQuery(GET_APPLE_IAP_INTEGRATION_DETAILS, {
    variables: { id: integrationId },
    skip: !integrationId,
  })
  const provider = data?.paymentProvider as AppleIapProvider
  const canEditIntegration = hasPermissions(['organizationIntegrationsUpdate'])
  const canDeleteIntegration = hasPermissions(['organizationIntegrationsDelete'])

  const webhookUrl = useMemo(() => {
    const baseUrl = (provider?.webhookBaseUrl || apiUrl).replace(/\/$/, '')

    return `${baseUrl}/webhooks/apple_iap/${organizationId}?code=${encodeURIComponent(provider?.code || '')}`
  }, [apiUrl, organizationId, provider?.code, provider?.webhookBaseUrl])

  const deleteCallback = () => {
    navigate(
      generatePath(APPLE_IAP_INTEGRATION_ROUTE, {
        integrationGroup: IntegrationsTabsOptionsEnum.Community,
      }),
    )
  }

  const openEditDialog = () =>
    addDialogRef.current?.openDialog({
      provider,
      onDeleteClick: () =>
        openDeleteAppleIapIntegrationDialog({ provider, callback: deleteCallback }),
    })

  return (
    <div>
      <MainHeader.Configure
        breadcrumb={[
          {
            label: translate('text_62b1edddbf5f461ab9712750'),
            path: generatePath(INTEGRATIONS_ROUTE, {
              integrationGroup: IntegrationsTabsOptionsEnum.Community,
            }),
          },
          {
            label: translate('text_1783468800000appleiapname'),
            path: generatePath(APPLE_IAP_INTEGRATION_ROUTE, {
              integrationGroup: IntegrationsTabsOptionsEnum.Community,
            }),
          },
        ]}
        entity={{
          viewName: provider?.name || '',
          viewNameLoading: loading,
          metadata: `${translate('text_1783468800000appleiapname')} • ${translate('text_62b1edddbf5f461ab971270d')}`,
          metadataLoading: loading,
          badges: [{ type: 'default', label: translate('text_62b1edddbf5f461ab971271f') }],
          icon: <AppleIap />,
        }}
        actions={{
          items: [
            {
              type: 'dropdown',
              label: translate('text_626162c62f790600f850b6fe'),
              items: [
                {
                  label: translate('text_65845f35d7d69c3ab4793dac'),
                  hidden: !canEditIntegration,
                  onClick: (closePopper) => {
                    openEditDialog()
                    closePopper()
                  },
                },
                {
                  label: translate('text_65845f35d7d69c3ab4793dad'),
                  hidden: !canDeleteIntegration,
                  onClick: (closePopper) => {
                    openDeleteAppleIapIntegrationDialog({
                      provider,
                      callback: deleteCallback,
                    })
                    closePopper()
                  },
                },
              ],
            },
          ],
          loading,
        }}
      />

      <div className="mb-12 flex max-w-[672px] flex-col gap-8 px-4 py-0 md:px-12">
        <section>
          <div className="flex h-18 w-full items-center justify-between">
            <Typography className="flex h-18 w-full items-center" variant="subhead1">
              {translate('text_664c732c264d7eed1c74fdc5')}
            </Typography>

            {canEditIntegration && (
              <Button variant="inline" align="left" onClick={openEditDialog}>
                {translate('text_65845f35d7d69c3ab4793dac')}
              </Button>
            )}
          </div>

          {!loading && provider && (
            <>
              <IntegrationsPage.DetailsItem
                icon="text"
                label={translate('text_6584550dc4cec7adf861504d')}
                value={provider.name}
              />
              <IntegrationsPage.DetailsItem
                icon="id"
                label={translate('text_6584550dc4cec7adf8615051')}
                value={provider.code}
              />
              <IntegrationsPage.DetailsItem
                icon="id"
                label={translate('text_1783468800000appleiapissuerid')}
                value={provider.issuerId}
              />
              <IntegrationsPage.DetailsItem
                icon="id"
                label={translate('text_1783468800000appleiapkeyid')}
                value={provider.keyId}
              />
              <IntegrationsPage.DetailsItem
                icon="id"
                label={translate('text_1783468800000appleiapbundleid')}
                value={provider.bundleId}
              />
              <IntegrationsPage.DetailsItem
                icon="id"
                label={translate('text_1783468800000appleiapappleid')}
                value={provider.appAppleId}
              />
              <IntegrationsPage.DetailsItem
                icon="text"
                label={translate('text_1783468800000appleiapproductids')}
                value={provider.productIds.join(', ')}
              />
              <IntegrationsPage.DetailsItem
                icon="link"
                label={translate('text_1783468800000appleiapbaseurl')}
                value={provider.webhookBaseUrl || '-'}
              />
              <div className="mt-6">
                <Alert type="info">{translate('text_1783468800000appleiapcallbackhelp')}</Alert>
              </div>
              <IntegrationsPage.DetailsItem
                icon="link"
                label={translate('text_1783468800000appleiapcallback')}
                value={webhookUrl}
              >
                <Tooltip
                  title={translate('text_1783468800000appleiapcopycallback')}
                  placement="top-end"
                >
                  <Button
                    variant="quaternary"
                    onClick={() => {
                      copyToClipboard(webhookUrl)
                      addToast({
                        severity: 'info',
                        message: translate('text_1783468800000appleiapcallbackcopied'),
                      })
                    }}
                  >
                    <Icon name="duplicate" />
                  </Button>
                </Tooltip>
              </IntegrationsPage.DetailsItem>
            </>
          )}
        </section>
      </div>

      <AddAppleIapDialog ref={addDialogRef} />
    </div>
  )
}

export default AppleIapIntegrationDetails
