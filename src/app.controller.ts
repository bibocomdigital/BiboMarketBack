import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { type ApiResponse as ApiResponseDto } from '@application/dto/response/api.response';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Health check', description: 'Check if the server is running' })
  @ApiResponse({ status: 200, description: 'Server is running' })
  @Get('health')
  health(): ApiResponseDto<{sucess: boolean, message: string}> {
    return this.appService.health();
  }
}
