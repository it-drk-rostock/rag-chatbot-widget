"use client";

import { Alert, Button, PasswordInput, Stack } from "@mantine/core";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction}>
      <Stack>
        <PasswordInput label="Admin password" name="password" autoComplete="current-password" required />
        {state.error && <Alert color="red" role="alert">{state.error}</Alert>}
        <Button type="submit" loading={pending}>Log in</Button>
      </Stack>
    </form>
  );
}
