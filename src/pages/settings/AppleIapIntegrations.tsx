import { gql, useQuery } from '@apollo/client'
import { useRef } from 'react'
import { generatePath } from 'react-router-dom'

import { Button } from '~/components/designSystem/Button'
import { IntegrationsPage } from '~/components/layouts/Integrations'
import { MainHeader } from '~/components/MainHeader/MainHeader'
import {
  AddAppleIapDialog,
  AddAppleIapDialogRef,
  APPLE_IAP_PROVIDER_FIELDS,
  AppleIapProvider,
} from '~/components/settings/integrations/AddAppleIapDialog'
import { useDeleteAppleIapIntegrationDialog } from '~/components/settings/integrations/DeleteAppleIapIntegrationDialog'
import { IntegrationsTabsOptionsEnum } from '~/core/constants/tabsOptions'
import { APPLE_IAP_INTEGRATION_DETAILS_ROUTE, INTEGRATIONS_ROUTE } from '~/core/router'
import { useInternationalization } from '~/hooks/core/useInternationalization'
import { usePermissions } from '~/hooks/usePermissions'
import AppleIap from '~/public/images/apple-iap.svg'

const GET_APPLE_IAP_INTEGRATIONS = gql`
  query getAppleIapIntegrationsList($limit: Int, $type: ProviderTypeEnum) {
    paymentProviders(limit: $limit, type: $type) {
      collection {
        ... on AppleIapProvider {
          ...AppleIapProviderFields
        }
      }
    }
  }
  ${APPLE_IAP_PROVIDER_FIELDS}
`

const AppleIapIntegrations = () => {
  const { hasPermissions } = usePermissions()
  const { translate } = useInternationalization()
  const addDialogRef = useRef<AddAppleIapDialogRef>(null)
  const { openDeleteAppleIapIntegrationDialog } = useDeleteAppleIapIntegrationDialog()
  const { data, loading } = useQuery(GET_APPLE_IAP_INTEGRATIONS, {
    variables: { limit: 1000, type: 'apple_iap' },
  })
  const connections = data?.paymentProviders?.collection as AppleIapProvider[] | undefined
  const canCreateIntegration = hasPermissions(['organizationIntegrationsCreate'])
  const canEditIntegration = hasPermissions(['organizationIntegrationsUpdate'])
  const canDeleteIntegration = hasPermissions(['organizationIntegrationsDelete'])

  return (
    <>
      <MainHeader.Configure
        breadcrumb={[
          {
            label: translate('text_62b1edddbf5f461ab9712750'),
            path: generatePath(INTEGRATIONS_ROUTE, {
              integrationGroup: IntegrationsTabsOptionsEnum.Community,
            }),
          },
        ]}
        entity={{
          viewName: translate('text_1783468800000appleiapname'),
          viewNameLoading: loading,
          metadata: translate('text_62b1edddbf5f461ab971271f'),
          metadataLoading: loading,
          badges: [{ type: 'default', label: translate('text_62b1edddbf5f461ab971270d') }],
          icon: <AppleIap />,
        }}
        actions={{
          items: [
            {
              type: 'action',
              label: translate('text_65846763e6140b469140e235'),
              variant: 'primary',
              hidden: !canCreateIntegration,
              onClick: () => {
                addDialogRef.current?.openDialog()
              },
            },
          ],
          loading,
        }}
      />

      <IntegrationsPage.Container>
        <section>
          <IntegrationsPage.Headline label={translate('text_65846763e6140b469140e239')} />

          {loading &&
            [1, 2].map((index) => (
              <IntegrationsPage.ItemSkeleton key={`apple-iap-skeleton-${index}`} />
            ))}

          {!loading &&
            connections?.map((connection) => (
              <IntegrationsPage.ListItem
                key={connection.id}
                to={generatePath(APPLE_IAP_INTEGRATION_DETAILS_ROUTE, {
                  integrationId: connection.id,
                  integrationGroup: IntegrationsTabsOptionsEnum.Community,
                })}
                label={connection.name}
                subLabel={connection.code}
              >
                {(canEditIntegration || canDeleteIntegration) && (
                  <div className="flex gap-2">
                    {canEditIntegration && (
                      <Button
                        icon="pen"
                        variant="quaternary"
                        onClick={(event) => {
                          event.preventDefault()
                          addDialogRef.current?.openDialog({
                            provider: connection,
                            onDeleteClick: () =>
                              openDeleteAppleIapIntegrationDialog({ provider: connection }),
                          })
                        }}
                      />
                    )}
                    {canDeleteIntegration && (
                      <Button
                        icon="trash"
                        variant="quaternary"
                        onClick={(event) => {
                          event.preventDefault()
                          openDeleteAppleIapIntegrationDialog({ provider: connection })
                        }}
                      />
                    )}
                  </div>
                )}
              </IntegrationsPage.ListItem>
            ))}
        </section>
      </IntegrationsPage.Container>

      <AddAppleIapDialog ref={addDialogRef} />
    </>
  )
}

export default AppleIapIntegrations
