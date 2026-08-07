import { PaymentProvidersListForCustomerMainInfosQuery } from '~/generated/graphql'

type CustomerPaymentProvider = NonNullable<
  PaymentProvidersListForCustomerMainInfosQuery['paymentProviders']
>['collection'][number]

export type LinkedPaymentProvider =
  Exclude<CustomerPaymentProvider, { __typename: 'AppleIapProvider' }> | undefined
