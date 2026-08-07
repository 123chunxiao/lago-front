import { gql } from '@apollo/client'
import { useMemo } from 'react'

import {
  PaymentProvidersListForCustomerCreateEditExternalAppsAccordionQuery,
  ProviderTypeEnum,
  usePaymentProvidersListForCustomerCreateEditExternalAppsAccordionQuery,
} from '~/generated/graphql'

gql`
  query paymentProvidersListForCustomerCreateEditExternalAppsAccordion($limit: Int) {
    paymentProviders(limit: $limit) {
      collection {
        ... on CashfreeProvider {
          __typename
          id
          name
          code
        }

        ... on AlipayProvider {
          __typename
          id
          name
          code
        }

        ... on AppleIapProvider {
          __typename
          id
          name
          code
        }

        ... on FlutterwaveProvider {
          __typename
          id
          name
          code
        }

        ... on StripeProvider {
          __typename
          id
          name
          code
        }

        ... on GocardlessProvider {
          __typename
          id
          name
          code
        }

        ... on AdyenProvider {
          __typename
          id
          name
          code
        }

        ... on MoneyhashProvider {
          __typename
          id
          name
          code
        }
      }
    }
  }
`

export const usePaymentProviders = (): {
  paymentProviders: PaymentProvidersListForCustomerCreateEditExternalAppsAccordionQuery | undefined
  isLoadingPaymentProviders: boolean
  getPaymentProvider: (code: string | undefined) => ProviderTypeEnum | null
} => {
  const { data: paymentProviders, loading: isLoadingPaymentProviders } =
    usePaymentProvidersListForCustomerCreateEditExternalAppsAccordionQuery({
      variables: { limit: 1000 },
    })

  // Apple IAP transactions are verified directly against App Store Server APIs.
  // It is not a reusable invoice payment method and must not appear in customer payment settings.
  type PaymentProvider = NonNullable<
    PaymentProvidersListForCustomerCreateEditExternalAppsAccordionQuery['paymentProviders']
  >['collection'][number]
  type InvoicePaymentProvider = Exclude<PaymentProvider, { __typename: 'AppleIapProvider' }>

  const invoicePaymentProviders = useMemo(() => {
    if (!paymentProviders?.paymentProviders) return paymentProviders

    return {
      ...paymentProviders,
      paymentProviders: {
        ...paymentProviders.paymentProviders,
        collection: paymentProviders.paymentProviders.collection.filter(
          (provider): provider is InvoicePaymentProvider =>
            provider.__typename !== 'AppleIapProvider',
        ),
      },
    }
  }, [paymentProviders])

  const getPaymentProvider = (code: string | undefined): ProviderTypeEnum | null => {
    if (!code) return null

    const provider = invoicePaymentProviders?.paymentProviders?.collection.find(
      (paymentProvider) => paymentProvider.code === code,
    )

    if (!provider) return null

    return provider.__typename.toLocaleLowerCase().replace('provider', '') as ProviderTypeEnum
  }

  return {
    paymentProviders: invoicePaymentProviders,
    isLoadingPaymentProviders,
    getPaymentProvider,
  }
}
