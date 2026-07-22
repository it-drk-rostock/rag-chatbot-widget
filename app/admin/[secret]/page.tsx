import { Button, Container, Paper, Stack, Title } from "@mantine/core";
import { notFound } from "next/navigation";
import { HelloWorldButton } from "../../hello-world-button";
import { isAdminAuthenticated, logout } from "../actions";
import { CrawlProgress } from "../crawl-progress";
import { LoginForm } from "../login-form";

export default async function AdminPage({
  params,
}: PageProps<"/admin/[secret]">) {
  const { secret } = await params;

  if (secret !== process.env.ADMIN_SECRET_PATH) notFound();
  const authenticated = await isAdminAuthenticated();

  return (
    <Container size="xs" py="xl">
      <Paper withBorder p="xl" radius="md">
        <Stack>
          <Title order={1}>
            {authenticated ? "Admin Dashboard" : "Admin login"}
          </Title>
          {authenticated ? (
            <>
              <CrawlProgress />
              <HelloWorldButton />
              <form action={logout}>
                <Button type="submit" variant="subtle">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <LoginForm />
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
