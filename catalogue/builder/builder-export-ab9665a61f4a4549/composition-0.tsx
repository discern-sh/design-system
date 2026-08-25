import type { ComponentProps } from "react";
import {
  AgentAvatar,
  AgentMention,
  AgentPersona,
  ApertureBackdrop,
  ApproachBackdrop,
  Avatar,
  AvatarGroup,
  Backdrop,
  Badge,
  Banner,
  Brand,
  Breadcrumbs,
  Button,
  Byline,
  Card,
  Checkbox,
  CleaveBackdrop,
  Cluster,
  Command,
  CommandGroup,
  CompressionBackdrop,
  Container,
  Dialog,
  Diffstat,
  Divider,
  EmptyState,
  EnvelopeBackdrop,
  ExpectedResult,
  Field,
  Fleet,
  FoldBackdrop,
  Grid,
  HarmonicBackdrop,
  Heading,
  HoverCard,
  Icon,
  IconButton,
  ImpressionBackdrop,
  Input,
  Kicker,
  Logo,
  Masonry,
  Mention,
  Meter,
  PathReference,
  Persona,
  Procedure,
  ProcedureStep,
  ProfileCard,
  Radio,
  Receipt,
  Section,
  Select,
  Stack,
  Stat,
  SurveyBackdrop,
  Switch,
  Table,
  Tabs,
  Tag,
  Terminal,
  Textarea,
  ThemeSwitcher,
  ThemeToggle,
  TilingBackdrop,
  Toast,
  Tooltip,
  Transcript,
  Window,
  Worklog,
} from "@discern-sh/design-system/react";

export interface IconCompositionCallbacks {
  /** Required by the <ThemeToggle> instance. */
  readonly themeToggleOnThemeChange: ComponentProps<
    typeof ThemeToggle
  >["onThemeChange"];
  /** Required by the <ThemeSwitcher> instance. */
  readonly themeSwitcherOnModeChange: ComponentProps<
    typeof ThemeSwitcher
  >["onModeChange"];
  /** Required by the <Dialog> instance. */
  readonly dialogOnOpenChange: ComponentProps<typeof Dialog>["onOpenChange"];
}

/** Icon — composed with the Discern interface builder. */
export function IconComposition(callbacks: IconCompositionCallbacks) {
  return (
    <>
      <Icon>
        Text
      </Icon>
      <Button>
        Text
      </Button>
      <IconButton icon="Text" label="Text" />
      <ThemeToggle
        theme="light"
        onThemeChange={callbacks.themeToggleOnThemeChange}
      />
      <ThemeSwitcher onModeChange={callbacks.themeSwitcherOnModeChange} />
      <Logo>
        Text
      </Logo>
      <Brand name="Text" />
      <Container>
        Text
      </Container>
      <Stack>
        Text
      </Stack>
      <Cluster>
        Text
      </Cluster>
      <Grid>
        Text
      </Grid>
      <Masonry>
        Text
      </Masonry>
      <Section>
        Text
      </Section>
      <Badge>
        Text
      </Badge>
      <Card>
        Text
      </Card>
      <Divider />
      <Heading>
        Text
      </Heading>
      <Kicker>
        Text
      </Kicker>
      <Tag>
        Text
      </Tag>
      <Window>
        Text
      </Window>
      <Terminal>
        Text
      </Terminal>
      <Table>
        {""}
      </Table>
      <Stat label="Text" value="Text" />
      <Diffstat added={0} removed={0} />
      <Backdrop>
        Text
      </Backdrop>
      <SurveyBackdrop />
      <ApproachBackdrop />
      <FoldBackdrop />
      <ApertureBackdrop />
      <ImpressionBackdrop />
      <EnvelopeBackdrop />
      <CleaveBackdrop />
      <TilingBackdrop />
      <CompressionBackdrop />
      <HarmonicBackdrop />
      <Field controlId="Text">
        Text
      </Field>
      <Input />
      <Textarea />
      <Select />
      <Checkbox label="Text" />
      <Radio label="Text" />
      <Switch label="Text" />
      <Banner>
        Text
      </Banner>
      <Toast>
        Text
      </Toast>
      <Tooltip label="Text">
        <Button>
          Text
        </Button>
      </Tooltip>
      <HoverCard
        label="Text"
        trigger={
          <Button>
            Text
          </Button>
        }
      >
        Text
      </HoverCard>
      <Dialog
        open={false}
        title="Text"
        onOpenChange={callbacks.dialogOnOpenChange}
      >
        Text
      </Dialog>
      <Meter label="Text" value={0} />
      <EmptyState title="Text" />
      <Tabs items={[]} />
      <Breadcrumbs current="Text" />
      <Avatar name="Text" />
      <AvatarGroup>
        Text
      </AvatarGroup>
      <Persona name="Text" />
      <Mention name="Text" />
      <Byline authors="Text" />
      <ProfileCard name="Text" />
      <AgentAvatar name="Text" />
      <AgentPersona name="Text" />
      <AgentMention name="Text" />
      <Worklog entries={[]} />
      <Transcript turns={[]} />
      <Receipt title="Text" />
      <Fleet rows={[]} />
      <Command command="Text" />
      <CommandGroup items={[]} />
      <ExpectedResult>
        Text
      </ExpectedResult>
      <PathReference path="Text" />
      <Procedure completion="Text" steps={[]} title="Text" />
      <ProcedureStep action="Text" title="Text" />
    </>
  );
}
