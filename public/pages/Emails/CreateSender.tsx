/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useContext, useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { SERVER_DELAY } from '../../../common';
import { ContentPanel } from '../../components/ContentPanel';
import { CoreServicesContext } from '../../components/coreServices';
import { ServicesContext } from '../../services';
import { BREADCRUMBS, ENCRYPTION_TYPE, ROUTES, setBreadcrumbs } from '../../utils/constants';
import { getErrorMessage } from '../../utils/helpers';
import { CreateSenderForm } from './components/forms/CreateSenderForm';
import { createSenderConfigObject } from './utils/helper';
import {
  validateEmail,
  validateHost,
  validatePort,
  validateSenderName,
} from './utils/validationHelper';
import { getUseUpdatedUx } from '../../services/utils/constants';
interface CreateSenderProps extends RouteComponentProps<{ id?: string }> {
  edit?: boolean;
}

export function CreateSender(props: CreateSenderProps) {
  const coreContext = useContext(CoreServicesContext)!;
  const servicesContext = useContext(ServicesContext)!;

  const [loading, setLoading] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [email, setEmail] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [encryption, setEncryption] = useState<keyof typeof ENCRYPTION_TYPE>(
    Object.keys(ENCRYPTION_TYPE)[0] as keyof typeof ENCRYPTION_TYPE
  );
  const [inputErrors, setInputErrors] = useState<{ [key: string]: string[] }>({
    senderName: [],
    email: [],
    host: [],
    port: [],
  });

  useEffect(() => {
    setBreadcrumbs([
      BREADCRUMBS.NOTIFICATIONS,
      BREADCRUMBS.EMAIL_SENDERS,
      props.edit ? BREADCRUMBS.EDIT_SENDER : BREADCRUMBS.CREATE_SENDER,
    ]);
    window.scrollTo(0, 0);

    if (props.edit) {
      getSender();
    }
  }, []);

  const getSender = async () => {
    const id = props.match.params?.id;
    if (typeof id !== 'string') return;

    try {
      const response = await servicesContext.notificationService.getSender(id);
      setSenderName(response.name);
      setEmail(response.smtp_account.from_address);
      setHost(response.smtp_account.host);
      setPort(response.smtp_account.port);
      setEncryption(response.smtp_account.method);
    } catch (error) {
      coreContext.notifications.toasts.addDanger(
        getErrorMessage(error, 'There was a problem loading sender.')
      );
    }
  };

  const isInputValid = (): boolean => {
    const errors: { [key: string]: string[] } = {
      senderName: validateSenderName(senderName),
      email: validateEmail(email),
      host: validateHost(host),
      port: validatePort(port),
    };
    setInputErrors(errors);
    return !Object.values(errors).reduce(
      (errorFlag, error) => errorFlag || error.length > 0,
      false
    );
  };

  return (
    <>
      {!getUseUpdatedUx() && (
        <EuiText size="s">
          <h1>{`${props.edit ? 'Edit' : 'Create'} SMTP sender`}</h1>
        </EuiText>
      )}

      <EuiSpacer />
      <ContentPanel
        bodyStyles={{ padding: 'initial' }}
        title="Configure sender"
        titleSize="s"
        panelStyles={{ maxWidth: 1000 }}
      >
        <CreateSenderForm
          senderName={senderName}
          setSenderName={setSenderName}
          email={email}
          setEmail={setEmail}
          host={host}
          setHost={setHost}
          port={port}
          setPort={setPort}
          encryption={encryption}
          setEncryption={setEncryption}
          inputErrors={inputErrors}
          setInputErrors={setInputErrors}
        />
      </ContentPanel>

      <EuiSpacer />
      <EuiFlexGroup justifyContent="flexEnd" style={{ maxWidth: 1024 }}>
        <EuiFlexItem grow={false}>
          <EuiSmallButtonEmpty href={`#${ROUTES.EMAIL_SENDERS}`}>
            Cancel
          </EuiSmallButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSmallButton
            fill
            isLoading={loading}
            onClick={async () => {
              if (!isInputValid()) {
                coreContext.notifications.toasts.addDanger(
                  'Some fields are invalid. Fix all highlighted error(s) before continuing.'
                );
                return;
              }
              setLoading(true);
              const config = createSenderConfigObject(
                senderName,
                host,
                port,
                encryption,
                email
              );
              const request = props.edit
                ? servicesContext.notificationService.updateConfig(
                  props.match.params.id!,
                  config
                )
                : servicesContext.notificationService.createConfig(config);
              await request
                .then((response) => {
                  coreContext.notifications.toasts.addSuccess(
                    `Sender ${senderName} successfully ${props.edit ? 'updated' : 'created'
                    }.`
                  );
                  setTimeout(
                    () => location.hash = `#${ROUTES.EMAIL_SENDERS}`,
                    SERVER_DELAY
                  );
                })
                .catch((error) => {
                  setLoading(false);
                  coreContext.notifications.toasts.addError(error?.body || error, {
                    title: `Failed to ${props.edit ? 'update' : 'create'
                      } sender.`,
                  });
                });
            }}
          >
            {props.edit ? 'Save' : 'Create'}
          </EuiSmallButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
