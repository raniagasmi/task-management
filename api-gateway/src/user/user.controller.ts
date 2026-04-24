import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Request } from 'express';
import { Req, Body } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CollaborationGateway } from '../collaboration/collaboration.gateway';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
    private readonly auditService: AuditService,
    private readonly collaborationGateway: CollaborationGateway,
  ) {}

  @Get('me')
  async getProfile(@Req() req: Request) {
    if (!req.user) {
      throw new Error('User not found in request');
    }
    console.log('Getting profile for user:', req.user);

    const userId = (req.user as any).userId; // Cast to 'any' or the correct type
    const result = await this.userService.findById(userId);
    console.log('Profile result:', result);
    return result;
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllUsers(@Req() req: Request) {
    try {
      console.log('Fetching all users');
      const currentUser = req.user as { userId?: string; email?: string; role?: string } | undefined;
      const result = await this.userClient
        .send({ cmd: 'findAllUsers' }, {})
        .toPromise();
      await this.auditService.logAction({
        actorId: currentUser?.userId ?? 'unknown',
        actorEmail: currentUser?.email ?? 'unknown',
        actorRole: currentUser?.role ?? 'admin',
        action: 'users.view_all',
        resource: 'users',
      });
      console.log('All users result:', result);
      return result;
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  }

  @Get('me/:userId')
  async getUserById(@Param('userId') userId: string) {
    try {
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }
      return user;
    } catch (error) {
      console.error('Error finding user by id:', error);
      throw error;
    }
  }

  @Get('email/:email')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getUserByEmail(@Param('email') email: string) {
    try {
      const user = await this.userService.findByEmail(email);
      if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
      }
      return user;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  @Get('audit-logs')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAuditLogs() {
    return this.auditService.findAll();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getUserByIdRoute(@Param('id') id: string) {
    try {
      const user = await this.userService.findById(id);
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
      return user;
    } catch (error) {
      console.error('Error finding user by id:', error);
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async deleteUser(@Param('id') id: string, @Req() req: Request) {
    const currentUser = req.user as { userId?: string; email?: string; role?: string } | undefined;
    await this.userService.delete(id);
    await this.auditService.logAction({
      actorId: currentUser?.userId ?? 'unknown',
      actorEmail: currentUser?.email ?? 'unknown',
      actorRole: currentUser?.role ?? 'admin',
      action: 'user.deleted',
      resource: 'users',
      resourceId: id,
    });

    return { message: 'User deleted successfully' };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: any,
    @Req() req: Request,
  ) {
    try {
      const currentUser = req.user as { userId?: string; email?: string; role?: string } | undefined;
      if (!currentUser?.userId) {
        throw new ForbiddenException('User not authenticated');
      }

      if (currentUser.role !== 'admin' && currentUser.userId !== id) {
        throw new ForbiddenException('You can only update your own profile');
      }

      if (currentUser.role !== 'admin' && 'role' in (updateUserDto ?? {})) {
        throw new ForbiddenException('Only admins can assign roles');
      }

      const user = await this.userService.findById(id);
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      const updated = await this.userService.update(id, updateUserDto);

      if (currentUser.role === 'admin') {
        await this.auditService.logAction({
          actorId: currentUser.userId,
          actorEmail: currentUser.email ?? 'unknown',
          actorRole: currentUser.role,
          action: 'user.updated',
          resource: 'users',
          resourceId: id,
          metadata: { changedFields: Object.keys(updateUserDto ?? {}) },
        });
      }

      return updated;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  @Put('me/presence')
  async updateMyPresence(@Body() updatePresenceDto: any, @Req() req: Request) {
    const currentUser = req.user as { userId?: string } | undefined;
    if (!currentUser?.userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const updatedUser = await this.userService.updatePresence(currentUser.userId, updatePresenceDto);
    this.collaborationGateway.emitPresenceUpdated({
      userId: currentUser.userId,
      status: updatedUser?.presenceStatus ?? 'OFFLINE',
      lastActiveAt: updatedUser?.lastActiveAt ? new Date(updatedUser.lastActiveAt).toISOString() : null,
      updatedAt: updatedUser?.presenceUpdatedAt ? new Date(updatedUser.presenceUpdatedAt).toISOString() : null,
    });

    return updatedUser;
  }

  @Put(':id/password')
  @UseGuards(JwtAuthGuard)
  async updatePassword(
    @Param('id') id: string,
    @Body() updatePasswordDto: any,
    @Req() req: Request,
  ) {
    try {
      const currentUser = req.user as { userId?: string; email?: string; role?: string } | undefined;
      if (!currentUser?.userId) {
        throw new ForbiddenException('User not authenticated');
      }

      if (currentUser.role !== 'admin' && currentUser.userId !== id) {
        throw new ForbiddenException('You can only update your own password');
      }

      const user = await this.userService.findById(id);
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
      const result = await this.userService.updatePassword(
        id,
        updatePasswordDto,
      );

      if (currentUser.role === 'admin') {
        await this.auditService.logAction({
          actorId: currentUser.userId,
          actorEmail: currentUser.email ?? 'unknown',
          actorRole: currentUser.role,
          action: 'user.password_updated',
          resource: 'users',
          resourceId: id,
        });
      }

      return result;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

}
