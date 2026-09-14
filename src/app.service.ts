import { ApiResponse } from '@application/dto/response/api.response';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {

  health() : ApiResponse<{sucess: boolean, message: string}> {
    return {success: true, data: {sucess: true, message: "Server run sucess !"}}
  }
}
