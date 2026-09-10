import { create } from "@bufbuild/protobuf";
import {
  Badge,
  Box,
  Card,
  Flex,
  Heading,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  FiCalendar,
  FiDatabase,
  FiEdit2,
  FiPlay,
  FiPlus,
} from "react-icons/fi";
import { useMemo } from "react";
import { useNavigate } from "react-router";
import type { Plan } from "../../../gen/ts/v1/config_pb";
import { OperationStatus } from "../../../gen/ts/v1/operations_pb";
import {
  BackupRequestSchema,
  OpSelectorSchema,
} from "../../../gen/ts/v1/service_pb";
import { alerts } from "../../components/common/Alerts";
import { useShowModal } from "../../components/common/ModalManager";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { backrestService } from "../../api/client";
import { colorForStatus } from "../../api/flowDisplayAggregator";
import { useResourceStatus } from "../../api/resourceStatus";
import { useConfig } from "../../app/provider";
import * as m from "../../paraglide/messages";

const statusText = (status: OperationStatus) => {
  switch (status) {
    case OperationStatus.STATUS_INPROGRESS:
      return "Running";
    case OperationStatus.STATUS_SUCCESS:
      return "Healthy";
    case OperationStatus.STATUS_WARNING:
      return "Warning";
    case OperationStatus.STATUS_ERROR:
      return "Needs attention";
    default:
      return "No recent activity";
  }
};

const ResourceStatus = ({
  planId,
  repoGuid,
}: {
  planId?: string;
  repoGuid?: string;
}) => {
  const selector = useMemo(
    () => create(OpSelectorSchema, { planId, repoGuid }),
    [planId, repoGuid],
  );
  const status = useResourceStatus(selector);
  const color = colorForStatus(status);
  return (
    <Flex
      align="center"
      gap={2}
      color={color}
      fontSize="sm"
      fontWeight="medium"
    >
      <Box width="8px" height="8px" borderRadius="full" bg={color} />
      {statusText(status)}
    </Flex>
  );
};

const scheduleLabel = (plan: Plan) => {
  const schedule = plan.schedule?.schedule;
  if (!schedule?.case || schedule.case === "disabled") return "Manual only";
  if (schedule.case === "cron") return `Cron: ${schedule.value}`;
  if (schedule.case === "maxFrequencyHours") {
    if (schedule.value === 24) return "Daily";
    if (schedule.value === 1) return "Hourly";
    return `Every ${schedule.value} hours`;
  }
  if (schedule.case === "maxFrequencyDays") {
    return `Every ${schedule.value} days`;
  }
  return "Scheduled";
};

const PageHeading = ({
  title,
  onAdd,
  addLabel,
}: {
  title: string;
  onAdd: () => void;
  addLabel: string;
}) => (
  <Flex
    align={{ base: "stretch", sm: "flex-start" }}
    justify="space-between"
    direction={{ base: "column", sm: "row" }}
    gap={4}
  >
    <Box>
      <Heading size="xl">{title}</Heading>
    </Box>
    <Button onClick={onAdd} flexShrink={0}>
      <FiPlus /> {addLabel}
    </Button>
  </Flex>
);

export const PlansPage = () => {
  const [config] = useConfig();
  const navigate = useNavigate();
  const showModal = useShowModal();

  if (!config) return null;

  const addPlan = async () => {
    const { AddPlanModal } = await import("../plans/AddPlanModal");
    showModal(<AddPlanModal template={null} />);
  };

  return (
    <Stack gap={6} width="full" data-testid="plans-page">
      <PageHeading
        title={m.app_menu_plans()}
        onAdd={addPlan}
        addLabel={m.app_menu_add_plan()}
      />

      {config.plans.length === 0 ? (
        <EmptyState title={m.dashboard_plans_empty()} icon={<FiCalendar />} />
      ) : (
        <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
          {config.plans.map((plan) => {
            const repo = config.repos.find(
              (candidate) => candidate.id === plan.repo,
            );
            return (
              <Card.Root
                key={plan.id}
                data-testid={`plan-card-${plan.id}`}
                borderRadius="xl"
                borderLeftWidth="4px"
                borderLeftColor="blue.500"
              >
                <Card.Body p={{ base: 4, md: 5 }}>
                  <Stack gap={5}>
                    <Flex justify="space-between" gap={3} align="flex-start">
                      <Flex gap={3} minW={0}>
                        <Flex
                          width={10}
                          height={10}
                          borderRadius="lg"
                          bg="blue.500/10"
                          color="blue.500"
                          align="center"
                          justify="center"
                          flexShrink={0}
                        >
                          <FiCalendar />
                        </Flex>
                        <Box minW={0}>
                          <Heading size="md" truncate>
                            {plan.id}
                          </Heading>
                          <Text color="fg.muted" fontSize="sm" truncate>
                            Backs up to {plan.repo || "No repository selected"}
                          </Text>
                        </Box>
                      </Flex>
                      <ResourceStatus planId={plan.id} repoGuid={repo?.guid} />
                    </Flex>

                    <Flex gap={2} flexWrap="wrap">
                      <Badge variant="subtle" colorPalette="blue">
                        {scheduleLabel(plan)}
                      </Badge>
                      <Badge variant="outline">
                        {plan.paths.length}{" "}
                        {plan.paths.length === 1 ? "path" : "paths"}
                      </Badge>
                    </Flex>

                    <Flex gap={2} justify="space-between" flexWrap="wrap">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await backrestService.backup(
                              create(BackupRequestSchema, { value: plan.id }),
                            );
                            alerts.success(m.plan_backup_scheduled());
                          } catch (error: any) {
                            alerts.error(m.plan_error_backup() + error.message);
                          }
                        }}
                      >
                        <FiPlay /> {m.plan_button_backup()}
                      </Button>
                      <Flex gap={2}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/plan/${plan.id}`)}
                        >
                          Open
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const { AddPlanModal } =
                              await import("../plans/AddPlanModal");
                            showModal(<AddPlanModal template={plan} />);
                          }}
                        >
                          <FiEdit2 /> Edit
                        </Button>
                      </Flex>
                    </Flex>
                  </Stack>
                </Card.Body>
              </Card.Root>
            );
          })}
        </SimpleGrid>
      )}
    </Stack>
  );
};

export const RepositoriesPage = () => {
  const [config] = useConfig();
  const navigate = useNavigate();
  const showModal = useShowModal();

  if (!config) return null;

  const addRepo = async () => {
    const { AddRepoModal } = await import("../repositories/AddRepoModal");
    showModal(<AddRepoModal template={null} />);
  };

  return (
    <Stack gap={6} width="full" data-testid="repositories-page">
      <PageHeading
        title={m.app_menu_repos()}
        onAdd={addRepo}
        addLabel={m.app_menu_add_repo()}
      />

      {config.repos.length === 0 ? (
        <EmptyState title={m.dashboard_repos_empty()} icon={<FiDatabase />} />
      ) : (
        <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
          {config.repos.map((repo) => {
            const plans = config.plans.filter((plan) => plan.repo === repo.id);
            return (
              <Card.Root
                key={repo.guid}
                data-testid={`repository-card-${repo.id}`}
                borderRadius="xl"
                bg="bg.panel"
                borderWidth="1px"
              >
                <Card.Body p={{ base: 4, md: 5 }}>
                  <Stack gap={5}>
                    <Flex justify="space-between" gap={3} align="flex-start">
                      <Flex gap={3} minW={0}>
                        <Flex
                          width={10}
                          height={10}
                          borderRadius="full"
                          bg="purple.500/10"
                          color="purple.500"
                          align="center"
                          justify="center"
                          flexShrink={0}
                        >
                          <FiDatabase />
                        </Flex>
                        <Box minW={0}>
                          <Heading size="md" truncate>
                            {repo.id}
                          </Heading>
                          <Text
                            color="fg.muted"
                            fontFamily="mono"
                            fontSize="xs"
                            overflowWrap="anywhere"
                          >
                            {repo.uri}
                          </Text>
                        </Box>
                      </Flex>
                      <ResourceStatus repoGuid={repo.guid} />
                    </Flex>

                    <Flex gap={2} flexWrap="wrap">
                      <Badge variant="subtle" colorPalette="purple">
                        {repo.originInstanceId
                          ? `Remote · ${repo.originInstanceId}`
                          : "Local repository"}
                      </Badge>
                      <Badge variant="outline">
                        Used by {plans.length}{" "}
                        {plans.length === 1 ? "plan" : "plans"}
                      </Badge>
                    </Flex>

                    <Flex gap={2} justify="flex-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/repo/${repo.id}`)}
                      >
                        Open
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const { AddRepoModal } =
                            await import("../repositories/AddRepoModal");
                          showModal(<AddRepoModal template={repo} />);
                        }}
                      >
                        <FiEdit2 /> Edit
                      </Button>
                    </Flex>
                  </Stack>
                </Card.Body>
              </Card.Root>
            );
          })}
        </SimpleGrid>
      )}
    </Stack>
  );
};
