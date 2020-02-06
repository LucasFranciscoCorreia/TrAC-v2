import sha1 from "crypto-js/sha1";
import { ValidationErrors } from "final-form";
import Cookies from "js-cookie";
import Router from "next/router";
import React, { FC, useContext, useEffect, useState } from "react";
import { Field, Form } from "react-final-form";
import { useUpdateEffect } from "react-use";
import {
  Button,
  Checkbox,
  Form as FormSemantic,
  Grid,
  Icon,
  Input,
  Message,
  Segment,
} from "semantic-ui-react";
import { isEmail, isLength } from "validator";

import { useMutation } from "@apollo/react-hooks";
import { Image } from "@chakra-ui/core";

import { LOCKED_USER, WRONG_INFO } from "../../constants";
import { ConfigContext } from "../components/Config";
import { LoadingPage } from "../components/Loading";
import { CURRENT_USER, LOGIN } from "../graphql/queries";
import { useUser } from "../utils/useUser";

const Login: FC = () => {
  const [session, setSession] = useState(() =>
    Cookies.get("remember") ? true : false
  );

  useUpdateEffect(() => {
    if (session) {
      Cookies.set("remember", "1", { expires: 30 });
    } else {
      Cookies.remove("remember");
    }
  }, [session]);

  const [login, { data, loading, error: errorMutation }] = useMutation(LOGIN, {
    update: (cache, { data }) => {
      if (data?.login.user) {
        cache.writeQuery({
          query: CURRENT_USER,
          data: {
            currentUser: data.login,
          },
        });
      }
    },
  });

  const {
    LOGIN_WRONG_INFO_MESSAGE,
    LOGIN_LOCKED_USER_MESSAGE,
    LOGIN_PUT_VALID_EMAIL,
    LOGIN_PUT_VALID_PASSWORD_LENGTH,
    LOGIN_EMAIL_LABEL,
    LOGIN_EMAIL_PLACEHOLDER,
    LOGIN_PASSWORD_LABEL,
    LOGIN_PASSWORD_PLACEHOLDER,
    LOGIN_REMEMBER_SESSION,
    LOGIN_BUTTON,
    LOGIN_ERROR_TITLE,
  } = useContext(ConfigContext);

  return (
    <Grid centered padded>
      
      <Grid.Row>
        <Image
          alt="UFRPE"
          src="/rural_logo.png"
          height="20vh"
          objectFit="contain"
          objectPosition="center"
        />
      </Grid.Row>

      {!loading && (data?.login?.error || errorMutation) && (
        <Grid.Row>
          <Message negative>
            <Message.Header>{LOGIN_ERROR_TITLE}</Message.Header>
            {(() => {
              switch (data?.login?.error) {
                case WRONG_INFO:
                  return LOGIN_WRONG_INFO_MESSAGE;
                case LOCKED_USER:
                  return LOGIN_LOCKED_USER_MESSAGE;
                default:
                  if (errorMutation) {
                    return errorMutation.message;
                  }
                  return data?.login.error;
              }
            })()}
          </Message>
        </Grid.Row>
      )}

      <Form
        onSubmit={async (
          {
            email,
            password,
          }: {
            email: string;
            password: string;
          },
          { change }
        ) => {
          const { data } = await login({
            variables: {
              email,
              password: sha1(password).toString(),
            },
          });
          if (data?.login.error) {
            change("password", "");
          }
        }}
        validate={({ email, password }) => {
          const errors: ValidationErrors = {};
          if (!email || !isEmail(email)) {
            errors.email = LOGIN_PUT_VALID_EMAIL;
          }
          if (!password || !isLength(password, { min: 3, max: 100 })) {
            errors.password = LOGIN_PUT_VALID_PASSWORD_LENGTH;
          }
          return errors;
        }}
      >
        {({ handleSubmit, pristine, invalid }) => {
          return (
            <FormSemantic size="big" onSubmit={handleSubmit}>
              <Segment size="big" basic>
                <Field name="email" type="email" initialValue="">
                  {({ input, meta: { touched, error } }) => (
                    <FormSemantic.Field
                      error={error && touched}
                      disabled={loading}
                    >
                      <label>{LOGIN_EMAIL_LABEL}</label>
                      <Input {...input} placeholder={LOGIN_EMAIL_PLACEHOLDER} />
                      <label>{touched && error}</label>
                    </FormSemantic.Field>
                  )}
                </Field>

                <Field name="password" initialValue="" type="password">
                  {({ input, meta: { touched, error } }) => (
                    <FormSemantic.Field
                      error={error && touched}
                      disabled={loading}
                    >
                      <label>{LOGIN_PASSWORD_LABEL}</label>
                      <Input
                        {...input}
                        placeholder={LOGIN_PASSWORD_PLACEHOLDER}
                      />
                      {<label>{touched && error}</label>}
                    </FormSemantic.Field>
                  )}
                </Field>
              </Segment>
              <Segment basic>
                <Checkbox
                  toggle
                  label={LOGIN_REMEMBER_SESSION}
                  onChange={() => {
                    setSession(!session);
                  }}
                  checked={session}
                  disabled={loading}
                />
              </Segment>
              <Segment basic>
                <Button
                  as="button"
                  type="submit"
                  size="big"
                  color="blue"
                  disabled={pristine || invalid || loading}
                  icon
                  labelPosition="left"
                  loading={loading}
                >
                  <Icon name="sign-in" />
                  {LOGIN_BUTTON}
                </Button>
              </Segment>
            </FormSemantic>
          );
        }}
      </Form>
    </Grid>
  );
};

export default () => {
  const { loading, user } = useUser();

  useEffect(() => {
    if (!loading && user?.email) {
      Router.push("/");
    }
  }, [loading, user]);

  if (loading) {
    return <LoadingPage />;
  }
  return <Login />;
};
