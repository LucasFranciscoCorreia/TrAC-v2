import { toSafeInteger, toString } from "lodash";
import React, { useEffect, useMemo } from "react";
import { useSetState } from "react-use";
import { Button, Checkbox, Icon, Input, Modal } from "semantic-ui-react";

import { Box, Stack, useDisclosure } from "@chakra-ui/core";

import { baseUserConfig, UserConfig } from "../../../../constants/userConfig";
import { IUserData } from "../../../graphql/queries";

export const useUpdateUserConfigModal = ({
  email,
  config: oldConfig,
}: Pick<IUserData, "email" | "config">) => {
  const { isOpen, onOpen, onClose } = useDisclosure(false);

  const [config, setConfig] = useSetState<UserConfig>({
    ...baseUserConfig,
    ...oldConfig,
  });

  useEffect(() => {
    setConfig({
      ...baseUserConfig,
      ...oldConfig,
    });
  }, [oldConfig, setConfig]);

  const userConfigModal = useMemo(() => {
    return (
      <Modal open={isOpen} onOpen={onOpen} onClose={onClose}>
        <Modal.Header>{`User ${email} Personal Configuration`}</Modal.Header>
        <Modal.Content>
          <Stack>
            {Object.keys(baseUserConfig).map(key => {
              const ConfigInput = () => {
                switch (typeof baseUserConfig[key]) {
                  case "boolean":
                    return (
                      <Checkbox
                        checked={config[key]}
                        label={key}
                        onChange={() => {
                          setConfig({
                            [key]: !config[key],
                          });
                        }}
                        type="checkbox"
                      />
                    );
                  case "string":
                    return (
                      <Input
                        value={config[key]}
                        label={key}
                        placeholder={baseUserConfig[key]}
                        onChange={(_, { value }) => {
                          setConfig({
                            [key]: toString(value),
                          });
                        }}
                      />
                    );
                  case "number":
                    return (
                      <Input
                        value={config[key]}
                        label={key}
                        onChange={(_, { value }) => {
                          setConfig({
                            [key]: toSafeInteger(value),
                          });
                        }}
                      />
                    );
                  default:
                    return null;
                }
              };
              return (
                <Box key={key}>
                  <ConfigInput />
                </Box>
              );
            })}
          </Stack>
        </Modal.Content>
      </Modal>
    );
  }, [isOpen, onOpen, onClose, config]);

  const trigger = useMemo(() => {
    return (
      <Button
        icon
        color="purple"
        onClick={ev => {
          ev.preventDefault();

          onOpen();
        }}
        labelPosition="left"
      >
        <Icon name="settings" />
        {userConfigModal}
        User Personal Configuration
      </Button>
    );
  }, [onOpen, userConfigModal]);

  return {
    isOpen,
    onOpen,
    onClose,
    config,
    userConfigModal: trigger,
  };
};