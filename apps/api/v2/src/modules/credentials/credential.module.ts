import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { CredentialsService } from "@/modules/credentials/credentials.service";
import { CredentialsController } from "@/modules/credentials/credentials.controller";
import { Module } from "@nestjs/common";
import { PrismaModule } from "@/modules/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [CredentialsController],
  providers: [CredentialsRepository, CredentialsService],
  exports: [CredentialsRepository, CredentialsService],
})
export class CredentialsModule {}