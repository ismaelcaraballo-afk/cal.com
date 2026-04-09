import { Controller, Get, Delete, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { GetUser } from "@/modules/auth/decorators/get-user.decorator";
import { CredentialsService } from "./credentials.service";
import { CredentialResponseDto } from "./dto/credential-response.dto";
import { RevokeResponseDto } from "./dto/revoke-response.dto";

@ApiTags("credentials")
@ApiBearerAuth()
@Controller("credentials")
@UseGuards(JwtAuthGuard)
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get()
  @ApiOperation({ summary: "List connected credentials for the authenticated user" })
  @ApiOkResponse({ type: [CredentialResponseDto] })
  async getCredentials(@GetUser("id") userId: number) {
    return this.credentialsService.getCredentialsForUser(userId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Revoke a connected credential" })
  @ApiParam({ name: "id", type: Number, description: "Credential ID to revoke" })
  @ApiOkResponse({ type: RevokeResponseDto })
  @ApiNotFoundResponse({ description: "Credential not found" })
  async revokeCredential(@Param("id", ParseIntPipe) credentialId: number, @GetUser("id") userId: number) {
    return this.credentialsService.revokeCredential(credentialId, userId);
  }
}
