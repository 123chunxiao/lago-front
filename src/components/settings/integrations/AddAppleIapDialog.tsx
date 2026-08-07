import { gql, useLazyQuery, useMutation } from '@apollo/client'
import Stack from '@mui/material/Stack'
import { useFormik } from 'formik'
import { ChangeEvent, forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { generatePath } from 'react-router-dom'
import { array, object, string } from 'yup'

import { Button } from '~/components/designSystem/Button'
import { Dialog, DialogRef } from '~/components/designSystem/Dialog'
import { TextInputField } from '~/components/form'
import { addToast } from '~/core/apolloClient'
import { IntegrationsTabsOptionsEnum } from '~/core/constants/tabsOptions'
import { APPLE_IAP_INTEGRATION_DETAILS_ROUTE, useNavigate } from '~/core/router'
import { LagoApiError } from '~/generated/graphql'
import { useInternationalization } from '~/hooks/core/useInternationalization'

export const APPLE_IAP_PROVIDER_FIELDS = gql`
  fragment AppleIapProviderFields on AppleIapProvider {
    id
    name
    code
    issuerId
    keyId
    bundleId
    appAppleId
    productIds
    webhookBaseUrl
  }
`

const GET_PROVIDER_BY_CODE = gql`
  query getProviderByCodeForAppleIap($code: String) {
    paymentProvider(code: $code) {
      ... on AppleIapProvider {
        id
      }
      ... on AdyenProvider {
        id
      }
      ... on AlipayProvider {
        id
      }
      ... on CashfreeProvider {
        id
      }
      ... on FlutterwaveProvider {
        id
      }
      ... on GocardlessProvider {
        id
      }
      ... on MoneyhashProvider {
        id
      }
      ... on StripeProvider {
        id
      }
    }
  }
`

const ADD_APPLE_IAP = gql`
  mutation addAppleIapPaymentProvider($input: AddAppleIapPaymentProviderInput!) {
    addAppleIapPaymentProvider(input: $input) {
      ...AppleIapProviderFields
    }
  }
  ${APPLE_IAP_PROVIDER_FIELDS}
`

const UPDATE_APPLE_IAP = gql`
  mutation updateAppleIapPaymentProvider($input: UpdateAppleIapPaymentProviderInput!) {
    updateAppleIapPaymentProvider(input: $input) {
      ...AppleIapProviderFields
    }
  }
  ${APPLE_IAP_PROVIDER_FIELDS}
`

export type AppleIapProvider = {
  id: string
  name: string
  code: string
  issuerId: string
  keyId: string
  bundleId: string
  appAppleId: string
  productIds: string[]
  webhookBaseUrl?: string | null
}

type AppleIapForm = Omit<AppleIapProvider, 'id' | 'productIds'> & {
  privateKey: string
  productIds: string
}

type AddAppleIapDialogProps = Partial<{
  provider: AppleIapProvider
  onDeleteClick: () => void
}>

export interface AddAppleIapDialogRef {
  openDialog: (props?: AddAppleIapDialogProps) => unknown
  closeDialog: () => unknown
}

const parseProductIds = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((productId) => productId.trim())
        .filter(Boolean),
    ),
  )

export const AddAppleIapDialog = forwardRef<AddAppleIapDialogRef>((_, ref) => {
  const navigate = useNavigate()
  const { translate } = useInternationalization()
  const dialogRef = useRef<DialogRef>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [localData, setLocalData] = useState<AddAppleIapDialogProps>()
  const [privateKeyFileName, setPrivateKeyFileName] = useState('')
  const provider = localData?.provider
  const isEdition = !!provider

  const [getProviderByCode] = useLazyQuery(GET_PROVIDER_BY_CODE)
  const mutationOptions = {
    refetchQueries: ['integrationsSetting', 'getAppleIapIntegrationsList'],
  }
  const [addAppleIap] = useMutation(ADD_APPLE_IAP, {
    ...mutationOptions,
    onCompleted({ addAppleIapPaymentProvider }) {
      const id = addAppleIapPaymentProvider?.id

      if (id) {
        navigate(
          generatePath(APPLE_IAP_INTEGRATION_DETAILS_ROUTE, {
            integrationId: id,
            integrationGroup: IntegrationsTabsOptionsEnum.Community,
          }),
        )
        addToast({ message: translate('text_1783468800000appleiapcreated'), severity: 'success' })
      }
    },
  })
  const [updateAppleIap] = useMutation(UPDATE_APPLE_IAP, {
    ...mutationOptions,
    onCompleted({ updateAppleIapPaymentProvider }) {
      const id = updateAppleIapPaymentProvider?.id

      if (id) {
        navigate(
          generatePath(APPLE_IAP_INTEGRATION_DETAILS_ROUTE, {
            integrationId: id,
            integrationGroup: IntegrationsTabsOptionsEnum.Community,
          }),
        )
        addToast({ message: translate('text_1783468800000appleiapupdated'), severity: 'success' })
      }
    },
  })

  const formikProps = useFormik<AppleIapForm>({
    initialValues: {
      name: provider?.name || '',
      code: provider?.code || 'apple-iap',
      issuerId: provider?.issuerId || '',
      keyId: provider?.keyId || '',
      privateKey: '',
      bundleId: provider?.bundleId || '',
      appAppleId: provider?.appAppleId || '',
      productIds: provider?.productIds?.join('\n') || '',
      webhookBaseUrl: provider?.webhookBaseUrl || '',
    },
    validationSchema: object().shape({
      name: string().required(''),
      code: string().required(''),
      issuerId: string().required(''),
      keyId: string().required(''),
      privateKey: isEdition ? string() : string().required(''),
      bundleId: string().required(''),
      appAppleId: string().matches(/^\d+$/).required(''),
      productIds: string()
        .test('productIds', '', (value) =>
          array()
            .min(1)
            .isValidSync(parseProductIds(value || '')),
        )
        .required(''),
      webhookBaseUrl: string()
        .url('')
        .matches(/^https:\/\//i, '')
        .required(''),
    }),
    onSubmit: async ({ privateKey, productIds, webhookBaseUrl, ...values }, formikBag) => {
      const response = await getProviderByCode({
        context: { silentErrorCodes: [LagoApiError.NotFound] },
        variables: { code: values.code },
      })
      const existingId = response.data?.paymentProvider?.id
      const codeIsAlreadyUsed =
        (!!existingId && !isEdition) || (isEdition && !!existingId && existingId !== provider?.id)

      if (codeIsAlreadyUsed) {
        formikBag.setFieldError('code', translate('text_632a2d437e341dcc76817556'))
        return
      }

      const input = {
        ...values,
        appAppleId: values.appAppleId,
        productIds: parseProductIds(productIds),
        webhookBaseUrl,
        ...(privateKey ? { privateKey } : {}),
      }

      if (isEdition) {
        await updateAppleIap({ variables: { input: { id: provider.id, ...input } } })
      } else {
        await addAppleIap({ variables: { input: { ...input, privateKey } } })
      }

      dialogRef.current?.closeDialog()
    },
    validateOnMount: true,
    enableReinitialize: true,
  })

  const onPrivateKeyFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return
    if (!file.name.toLowerCase().endsWith('.p8')) {
      formikProps.setFieldError('privateKey', 'text_1783468800000appleiapinvalidp8')
      event.target.value = ''
      return
    }

    const privateKey = await file.text()

    formikProps.setFieldValue('privateKey', privateKey, true)
    formikProps.setFieldTouched('privateKey', true)
    setPrivateKeyFileName(file.name)
    event.target.value = ''
  }

  useImperativeHandle(ref, () => ({
    openDialog: (data) => {
      setLocalData(data)
      setPrivateKeyFileName('')
      dialogRef.current?.openDialog()
    },
    closeDialog: () => dialogRef.current?.closeDialog(),
  }))

  return (
    <Dialog
      ref={dialogRef}
      title={
        isEdition
          ? translate('text_1783468800000appleiapedittitle', { name: provider?.name })
          : translate('text_1783468800000appleiapaddtitle')
      }
      description={translate('text_1783468800000appleiapdescription')}
      onClose={() => {
        formikProps.resetForm()
        setPrivateKeyFileName('')
      }}
      actions={({ closeDialog }) => (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          width={isEdition ? '100%' : 'inherit'}
          spacing={3}
        >
          {isEdition && (
            <Button
              danger
              variant="quaternary"
              onClick={() => {
                closeDialog()
                localData?.onDeleteClick?.()
              }}
            >
              {translate('text_6261640f28a49700f1290df5')}
            </Button>
          )}
          <Stack direction="row" spacing={3} alignItems="center">
            <Button variant="quaternary" onClick={closeDialog}>
              {translate('text_62b1edddbf5f461ab971276d')}
            </Button>
            <Button
              variant="primary"
              disabled={!formikProps.isValid || !formikProps.dirty}
              onClick={formikProps.submitForm}
            >
              {isEdition
                ? translate('text_1783468800000appleiapsavechanges')
                : translate('text_1783468800000appleiapaddtitle')}
            </Button>
          </Stack>
        </Stack>
      )}
    >
      <div className="mb-8 flex flex-col gap-6">
        <div className="flex flex-row items-start gap-6 *:flex-1">
          <TextInputField
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            formikProps={formikProps}
            name="name"
            label={translate('text_6584550dc4cec7adf861504d')}
          />
          <TextInputField
            formikProps={formikProps}
            name="code"
            label={translate('text_6584550dc4cec7adf8615051')}
          />
        </div>
        <div className="flex flex-row items-start gap-6 *:flex-1">
          <TextInputField
            formikProps={formikProps}
            name="issuerId"
            label={translate('text_1783468800000appleiapissuerid')}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
          <TextInputField
            formikProps={formikProps}
            name="keyId"
            label={translate('text_1783468800000appleiapkeyid')}
            placeholder="ABC123DEFG"
          />
        </div>
        <TextInputField
          formikProps={formikProps}
          name="privateKey"
          label={translate('text_1783468800000appleiapprivatekey')}
          placeholder={
            isEdition
              ? translate('text_1783468800000appleiapkeepkey')
              : '-----BEGIN PRIVATE KEY-----'
          }
          multiline
        />
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".p8"
            className="hidden"
            onChange={onPrivateKeyFileChange}
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            {translate('text_1783468800000appleiapuploadkey')}
          </Button>
          {!!privateKeyFileName && (
            <span className="text-sm text-grey-600">{privateKeyFileName}</span>
          )}
        </div>
        <div className="flex flex-row items-start gap-6 *:flex-1">
          <TextInputField
            formikProps={formikProps}
            name="bundleId"
            label={translate('text_1783468800000appleiapbundleid')}
            placeholder="com.example.app"
          />
          <TextInputField
            formikProps={formikProps}
            name="appAppleId"
            label={translate('text_1783468800000appleiapappleid')}
            placeholder="6755411989"
          />
        </div>
        <TextInputField
          formikProps={formikProps}
          name="productIds"
          label={translate('text_1783468800000appleiapproductids')}
          helperText={translate('text_1783468800000appleiapproductidshelp')}
          placeholder="pro.monthly, pro.yearly"
          multiline
        />
        <TextInputField
          formikProps={formikProps}
          name="webhookBaseUrl"
          label={translate('text_1783468800000appleiapbaseurl')}
          helperText={translate('text_1783468800000appleiapbaseurlhelp')}
          placeholder="https://billing.example.com"
        />
      </div>
    </Dialog>
  )
})

AddAppleIapDialog.displayName = 'AddAppleIapDialog'
