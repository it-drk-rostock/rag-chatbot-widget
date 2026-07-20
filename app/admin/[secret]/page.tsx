import { Container, Paper, PasswordInput, Stack, Title } from "@mantine/core";
import { notFound } from "next/navigation";

export default async function AdminLoginPage({
  params,
}: PageProps<"/admin/[secret]">) {
  const { secret } = await params;

  if (secret !== process.env.ADMIN_SECRET_PATH) notFound();

  return (
    <Container size="xs" py="xl">
      <Paper withBorder p="xl" radius="md">
        <Stack>
          <Title order={1}>Admin login</Title>
          <PasswordInput
            label="Admin password"
            name="password"
            autoComplete="current-password"
            required
          />
        </Stack>
      </Paper>
    </Container>
  );
}
