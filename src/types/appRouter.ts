/**
 * Type-only AppRouter definition mirroring the backend tRPC routers.
 * This file provides the type shape for createTRPCReact<AppRouter>.
 */

import type { Lead, Property, Operation, Task, Interaction, KPIData, LeadStats, PipelineStats, ActivityItem, AlertItem, Article, Setting, Chat, UserData, Documento, Reservation, Offer, Prequalification, Visit, PaginatedResponse, ChatMessage } from './trpc';

interface ListInput {
  search?: string;
  status?: string;
  source?: string;
  tier?: string;
  page?: number;
  pageSize?: number;
}

interface PropertyListInput {
  search?: string;
  status?: string;
  zone?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}

interface OperationListInput {
  search?: string;
  type?: 'venta' | 'alquiler';
  stage?: string;
  page?: number;
  pageSize?: number;
}

interface TaskListInput {
  search?: string;
  status?: string;
  assignedTo?: string;
  page?: number;
  pageSize?: number;
}

interface InteractionListInput {
  leadId?: number;
  page?: number;
  pageSize?: number;
}

interface KnowledgeListInput {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

interface UserListInput {
  search?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

interface DocumentListInput {
  search?: string;
  page?: number;
  pageSize?: number;
}

interface AlertListInput {
  status?: string;
  page?: number;
  pageSize?: number;
}

interface ReservationListInput {
  status?: string;
  page?: number;
  pageSize?: number;
}

interface OfferListInput {
  status?: string;
  page?: number;
  pageSize?: number;
}

interface PrequalificationListInput {
  status?: string;
  page?: number;
  pageSize?: number;
}

interface VisitListInput {
  status?: string;
  page?: number;
  pageSize?: number;
}

interface ByIdInput {
  id: number | string;
}

interface PipelineInput {
  type?: 'venta' | 'alquiler';
}

interface CreateLeadInput {
  nombre: string;
  email: string;
  telefono: string;
  estado?: string;
  fuente?: string;
  zona?: string;
  tipoOperacion?: string;
  notas?: string;
}

interface UpdateLeadInput {
  id: number;
  nombre?: string;
  email?: string;
  telefono?: string;
  estado?: string;
  zona?: string;
  tipoOperacion?: string;
  notas?: string;
  tier?: string;
}

interface CreatePropertyInput {
  titulo: string;
  direccion: string;
  zona: string;
  tipo: string;
  estado?: string;
  operacion?: string;
  precio: number;
  habitaciones?: number;
  banos?: number;
  superficie?: number;
  propietario?: string;
  telefono?: string;
  email?: string;
  notas?: string;
  descripcion?: string;
}

interface UpdatePropertyInput {
  id: number;
  titulo?: string;
  direccion?: string;
  zona?: string;
  tipo?: string;
  estado?: string;
  operacion?: string;
  precio?: number;
  notas?: string;
  descripcion?: string;
}

interface CreateOperationInput {
  leadName: string;
  propertyRef: string;
  propertyAddress?: string;
  amount: number;
  type: 'venta' | 'alquiler';
  responsible?: string;
  notes?: string;
}

interface UpdateOperationInput {
  id: string;
  leadName?: string;
  amount?: number;
  responsible?: string;
  notes?: string;
}

interface ChangeStageInput {
  id: string;
  stageIndex: number;
}

interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  leadId?: number;
  assignedTo?: string;
}

interface UpdateTaskInput {
  id: number;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
}

interface CreateInteractionInput {
  leadId: number;
  tipo: string;
  direccion: 'entrante' | 'saliente';
  asunto: string;
  contenido: string;
}

interface CreateArticleInput {
  title: string;
  category: string;
  summary: string;
  content?: string;
  author?: string;
}

interface UpdateArticleInput {
  id: string;
  title?: string;
  category?: string;
  summary?: string;
  content?: string;
}

interface UpdateSettingInput {
  key: string;
  value: boolean | string | number;
}

interface ClassifyInput {
  id: number;
}

interface LinkPropertyInput {
  leadId: number;
  propertyId: number;
}

interface CreateChatInput {
  title?: string;
}

interface SendMessageInput {
  chatId: string;
  text: string;
}

interface CreateReservationInput {
  propertyId: number;
  leadId: number;
  amount: number;
}

interface ConfirmDepositInput {
  id: number;
}

interface CancelReservationInput {
  id: number;
}

interface CreateOfferInput {
  propertyId: number;
  leadId: number;
  amount: number;
}

interface UpdateOfferInput {
  id: number;
  amount?: number;
  status?: string;
}

interface CreatePrequalificationInput {
  leadId: number;
  maxBudget: number;
  monthlyIncome: number;
}

interface CreateVisitInput {
  propertyId: number;
  leadId: number;
  date: string;
  notes?: string;
}

interface UpdateVisitInput {
  id: number;
  date?: string;
  status?: string;
  notes?: string;
}

interface ResolveAlertInput {
  id: number;
}

interface CreateDocumentInput {
  name: string;
  type: string;
  url: string;
  operationId?: string;
  leadId?: number;
}

interface CreateUserInput {
  name: string;
  email: string;
  role: string;
}

interface UpdateUserInput {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  active?: boolean;
}

type QueryProcedure<TInput, TOutput> = {
  useQuery: (input?: TInput, options?: { enabled?: boolean; refetchInterval?: number }) => { data: TOutput | undefined; isLoading: boolean; error: Error | null };
  useSuspenseQuery: (input?: TInput) => { data: TOutput };
};

type MutationProcedure<TInput, TOutput> = {
  useMutation: (options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
    mutate: (input: TInput) => void;
    mutateAsync: (input: TInput) => Promise<TOutput>;
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: Error | null;
  };
};

type InfiniteQueryProcedure<TInput, TOutput> = {
  useInfiniteQuery: (input: TInput | undefined, options?: { getNextPageParam: (lastPage: TOutput) => number | undefined; initialCursor?: number }) => {
    data: { pages: TOutput[] } | undefined;
    fetchNextPage: () => void;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    isLoading: boolean;
  };
};

// ─── Router Shape ───────────────────────────────────────────────────

export interface AppRouter {
  crm: {
    leads: {
      list: QueryProcedure<ListInput, PaginatedResponse<Lead>>;
      getById: QueryProcedure<ByIdInput, Lead>;
      create: MutationProcedure<CreateLeadInput, Lead>;
      update: MutationProcedure<UpdateLeadInput, Lead>;
      delete: MutationProcedure<ByIdInput, { success: boolean }>;
      search: QueryProcedure<{ q: string }, Lead[]>;
      classify: MutationProcedure<ClassifyInput, Lead>;
      linkProperty: MutationProcedure<LinkPropertyInput, { success: boolean }>;
      unlinkProperty: MutationProcedure<LinkPropertyInput, { success: boolean }>;
      getLinkedProperties: QueryProcedure<{ leadId: number }, Property[]>;
    };
    properties: {
      list: QueryProcedure<PropertyListInput, PaginatedResponse<Property>>;
      getById: QueryProcedure<ByIdInput, Property>;
      create: MutationProcedure<CreatePropertyInput, Property>;
      update: MutationProcedure<UpdatePropertyInput, Property>;
      delete: MutationProcedure<ByIdInput, { success: boolean }>;
      search: QueryProcedure<{ q: string }, Property[]>;
      getLinkedLeads: QueryProcedure<{ propertyId: number }, Lead[]>;
    };
    operations: {
      list: QueryProcedure<OperationListInput, PaginatedResponse<Operation>>;
      getById: QueryProcedure<ByIdInput, Operation>;
      create: MutationProcedure<CreateOperationInput, Operation>;
      update: MutationProcedure<UpdateOperationInput, Operation>;
      changeStage: MutationProcedure<ChangeStageInput, Operation>;
      close: MutationProcedure<ByIdInput, Operation>;
      getPipeline: QueryProcedure<PipelineInput, { stages: PipelineStage[]; totalOperations: number; totalValue: number }>;
      getTimeline: QueryProcedure<ByIdInput, Operation['timeline']>;
    };
    tasks: {
      list: QueryProcedure<TaskListInput, PaginatedResponse<Task>>;
      getById: QueryProcedure<ByIdInput, Task>;
      create: MutationProcedure<CreateTaskInput, Task>;
      update: MutationProcedure<UpdateTaskInput, Task>;
      complete: MutationProcedure<ByIdInput, Task>;
      delete: MutationProcedure<ByIdInput, { success: boolean }>;
      getByLead: QueryProcedure<{ leadId: number }, Task[]>;
      getByUser: QueryProcedure<{ userId: string }, Task[]>;
      getOverdue: QueryProcedure<Record<string, never>, Task[]>;
    };
    interactions: {
      list: QueryProcedure<InteractionListInput, PaginatedResponse<Interaction>>;
      getByLead: QueryProcedure<{ leadId: number }, Interaction[]>;
      create: MutationProcedure<CreateInteractionInput, Interaction>;
      delete: MutationProcedure<ByIdInput, { success: boolean }>;
    };
    dashboard: {
      getKPIs: QueryProcedure<Record<string, never>, KPIData>;
      getLeadStats: QueryProcedure<Record<string, never>, LeadStats>;
      getPipelineStats: QueryProcedure<Record<string, never>, PipelineStats>;
      getRecentActivity: QueryProcedure<{ limit?: number }, ActivityItem[]>;
      getAlerts: QueryProcedure<{ limit?: number }, AlertItem[]>;
    };
    knowledge: {
      list: QueryProcedure<KnowledgeListInput, PaginatedResponse<Article>>;
      getById: QueryProcedure<ByIdInput, Article>;
      create: MutationProcedure<CreateArticleInput, Article>;
      update: MutationProcedure<UpdateArticleInput, Article>;
      delete: MutationProcedure<ByIdInput, { success: boolean }>;
      search: QueryProcedure<{ q: string }, Article[]>;
    };
    users: {
      list: QueryProcedure<UserListInput, PaginatedResponse<UserData>>;
      getById: QueryProcedure<{ id: string }, UserData>;
      create: MutationProcedure<CreateUserInput, UserData>;
      update: MutationProcedure<UpdateUserInput, UserData>;
      delete: MutationProcedure<{ id: string }, { success: boolean }>;
    };
    documents: {
      list: QueryProcedure<DocumentListInput, PaginatedResponse<Documento>>;
      getById: QueryProcedure<ByIdInput, Documento>;
      create: MutationProcedure<CreateDocumentInput, Documento>;
      delete: MutationProcedure<ByIdInput, { success: boolean }>;
    };
    alerts: {
      list: QueryProcedure<AlertListInput, PaginatedResponse<AlertItem>>;
      create: MutationProcedure<Omit<AlertItem, 'id'>, AlertItem>;
      resolve: MutationProcedure<ResolveAlertInput, AlertItem>;
    };
    reservations: {
      list: QueryProcedure<ReservationListInput, PaginatedResponse<Reservation>>;
      create: MutationProcedure<CreateReservationInput, Reservation>;
      confirmDeposit: MutationProcedure<ConfirmDepositInput, Reservation>;
      cancel: MutationProcedure<CancelReservationInput, Reservation>;
    };
    offers: {
      list: QueryProcedure<OfferListInput, PaginatedResponse<Offer>>;
      create: MutationProcedure<CreateOfferInput, Offer>;
      update: MutationProcedure<UpdateOfferInput, Offer>;
    };
    prequalifications: {
      list: QueryProcedure<PrequalificationListInput, PaginatedResponse<Prequalification>>;
      create: MutationProcedure<CreatePrequalificationInput, Prequalification>;
    };
    visits: {
      list: QueryProcedure<VisitListInput, PaginatedResponse<Visit>>;
      create: MutationProcedure<CreateVisitInput, Visit>;
      update: MutationProcedure<UpdateVisitInput, Visit>;
    };
    settings: {
      list: QueryProcedure<Record<string, never>, Setting[]>;
      getByKey: QueryProcedure<{ key: string }, Setting>;
      update: MutationProcedure<UpdateSettingInput, Setting>;
    };
    cerebro: {
      listChats: QueryProcedure<Record<string, never>, Chat[]>;
      getChat: QueryProcedure<{ id: string }, Chat>;
      createChat: MutationProcedure<CreateChatInput, Chat>;
      sendMessage: MutationProcedure<SendMessageInput, ChatMessage>;
    };
  };
}
