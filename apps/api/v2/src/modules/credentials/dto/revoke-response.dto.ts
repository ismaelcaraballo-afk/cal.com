import { ApiProperty } from "@nestjs/swagger";

export class RevokeResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: "Credential revoked" })
  message!: string;
}
