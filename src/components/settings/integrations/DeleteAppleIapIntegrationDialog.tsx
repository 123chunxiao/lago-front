import { gql, useApolloClient, useMutation } from '@apollo/client'

import { useCentralizedDialog } from '~/components/dialogs/CentralizedDialog'
import { addToast } from '~/core/apolloClient'
import { useInternationalization } from '~/hooks/core/useInternationalization'

type OpenDeleteAppleIapIntegrationDialogData = {
  provider: { id: string; name?: string | null } | null
  callback?: () => void
}

export const useDeleteAppleIapIntegrationDialog = () => {
  const { translate } = useInternationalization()
  const centralizedDialog = useCentralizedDialog()
  const client = useApolloClient()
  const [deleteAppleIap] = useMutation(gql`
    mutation deleteAppleIapConnection($input: DestroyPaymentProviderInput!) {
      destroyPaymentProvider(input: $input) {
        id
      }
    }
  `)

  const openDeleteAppleIapIntegrationDialog = (data: OpenDeleteAppleIapIntegrationDialogData) => {
    const provider = data.provider

    centralizedDialog.open({
      title: translate('text_1783468800000appleiapdeletetitle', { name: provider?.name }),
      description: translate('text_1783468800000appleiapdeletedesc'),
      actionText: translate('text_6261640f28a49700f1290df5'),
      colorVariant: 'danger',
      onAction: async () => {
        const response = await deleteAppleIap({
          variables: { input: { id: provider?.id as string } },
          refetchQueries: ['integrationsSetting', 'getAppleIapIntegrationsList'],
        })

        if (response.data?.destroyPaymentProvider?.id) {
          if (provider?.id) {
            client.cache.evict({
              id: client.cache.identify({ id: provider.id, __typename: 'AppleIapProvider' }),
            })
          }
          client.cache.gc()
          data.callback?.()
          addToast({ message: translate('text_1783468800000appleiapdeleted'), severity: 'success' })
        }
      },
    })
  }

  return { openDeleteAppleIapIntegrationDialog }
}
