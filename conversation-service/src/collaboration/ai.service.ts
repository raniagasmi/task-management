import { Injectable } from '@nestjs/common';

export interface ProjectMemberInput {
  id: string;
  role: string;
  skills: string[];
}

export interface DecomposeProjectInput {
  prompt: string;
  members: ProjectMemberInput[];
}

export interface GeneratedTask {
  title: string;
  description: string;
  assignedTo: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

@Injectable()
export class AiService {
  async decomposeProject(input: DecomposeProjectInput): Promise<{ tasks: GeneratedTask[] }> {
    const normalizedPrompt = input.prompt.trim();
    const members = (input.members ?? []).filter((member) => member?.id && member.id.trim() !== '');

    const hasBackend = members.some((member) => this.detectTrack(member.role) === 'BACKEND');
    const hasFrontend = members.some((member) => this.detectTrack(member.role) === 'FRONTEND');
    const dependencySensitive = this.isDependencySensitivePrompt(normalizedPrompt);

    const prioritizedMembers =
      hasBackend && hasFrontend && dependencySensitive
        ? this.orderMembersWithDependencies(members)
        : this.orderMembersBalanced(members);

    const tasks = prioritizedMembers.map((member, index) => this.buildTaskForMember(normalizedPrompt, member, index));
    return { tasks };
  }

  private buildTaskForMember(prompt: string, member: ProjectMemberInput, index: number): GeneratedTask {
    const role = (member.role ?? '').toLowerCase();
    const roleLabel = role.replace(/_/g, ' ');
    const skillLabel = member.skills.length > 0 ? member.skills.slice(0, 3).join(', ') : roleLabel;
    const action = this.resolveActionByRole(role);
    const scope = this.resolveScopeByRole(role, prompt);

    return {
      title: `${action}: ${scope}`,
      description: `Implement ${scope} for the ${roleLabel || 'project'} role using ${skillLabel}. Keep it scoped to a 1-2 hour deliverable.`,
      assignedTo: member.id,
      priority: this.resolvePriority(role, index),
    };
  }

  private resolveActionByRole(role: string): string {
    if (role.includes('backend') || role.includes('api') || role.includes('server')) {
      return 'Build';
    }

    if (role.includes('frontend') || role.includes('ui') || role.includes('web')) {
      return 'Integrate';
    }

    if (role.includes('qa') || role.includes('test')) {
      return 'Validate';
    }

    if (role.includes('devops') || role.includes('infra')) {
      return 'Configure';
    }

    return 'Deliver';
  }

  private resolveScopeByRole(role: string, prompt: string): string {
    const shortPrompt = this.summarizePrompt(prompt);

    if (role.includes('backend') || role.includes('api') || role.includes('server')) {
      return `core API workflow for ${shortPrompt}`;
    }

    if (role.includes('frontend') || role.includes('ui') || role.includes('web')) {
      return `UI flow wired to existing APIs for ${shortPrompt}`;
    }

    if (role.includes('qa') || role.includes('test')) {
      return `acceptance test cases for ${shortPrompt}`;
    }

    if (role.includes('devops') || role.includes('infra')) {
      return `deployment checks for ${shortPrompt}`;
    }

    return `execution step for ${shortPrompt}`;
  }

  private summarizePrompt(prompt: string): string {
    const trimmed = (prompt ?? '').trim();
    if (trimmed.length <= 52) {
      return trimmed;
    }

    return `${trimmed.slice(0, 49).trimEnd()}...`;
  }

  private resolvePriority(role: string, index: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (role.includes('backend') || role.includes('api') || role.includes('server')) {
      return 'HIGH';
    }

    if (role.includes('frontend') || role.includes('ui') || role.includes('developer') || role.includes('engineer')) {
      return 'MEDIUM';
    }

    if (index === 0) {
      return 'HIGH';
    }

    return 'LOW';
  }

  private orderMembersWithDependencies(members: ProjectMemberInput[]): ProjectMemberInput[] {
    const backendMembers = members.filter((member) => this.detectTrack(member.role) === 'BACKEND');
    const frontendMembers = members.filter((member) => this.detectTrack(member.role) === 'FRONTEND');
    const otherMembers = members.filter((member) => this.detectTrack(member.role) === 'OTHER');
    return [...backendMembers, ...otherMembers, ...frontendMembers];
  }

  private orderMembersBalanced(members: ProjectMemberInput[]): ProjectMemberInput[] {
    const sorted = [...members].sort((a, b) => {
      const aTrack = this.detectTrack(a.role);
      const bTrack = this.detectTrack(b.role);
      if (aTrack === bTrack) {
        return a.id.localeCompare(b.id);
      }

      const weight: Record<'BACKEND' | 'FRONTEND' | 'OTHER', number> = {
        BACKEND: 1,
        FRONTEND: 2,
        OTHER: 3,
      };

      return weight[aTrack] - weight[bTrack];
    });

    return sorted;
  }

  private detectTrack(role: string): 'BACKEND' | 'FRONTEND' | 'OTHER' {
    const normalized = (role ?? '').toLowerCase();
    if (normalized.includes('backend') || normalized.includes('api') || normalized.includes('server')) {
      return 'BACKEND';
    }

    if (normalized.includes('frontend') || normalized.includes('ui') || normalized.includes('web')) {
      return 'FRONTEND';
    }

    return 'OTHER';
  }

  private isDependencySensitivePrompt(prompt: string): boolean {
    const normalized = prompt.toLowerCase();
    const dependencyKeywords = ['frontend', 'ui', 'api', 'backend', 'integration', 'connect', 'consume'];
    return dependencyKeywords.some((word) => normalized.includes(word));
  }
}
