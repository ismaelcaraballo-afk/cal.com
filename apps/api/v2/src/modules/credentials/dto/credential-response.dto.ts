import { ApiProperty } from "@nestjs/swagger";

export class CredentialResponseDto {
  @ApiProperty({ description: "Credential identifier", example: 42 })
  id!: number;

  @ApiProperty({ description: "Provider type (e.g. google_calendar)", example: "google_calendar" })
  type!: string;

  @ApiProperty({ description: "App slug for the credential", example: "google-calendar", nullable: true })
  appId!: string | null;

  @ApiProperty({
    description: "When the credential was last used",
    example: "2026-03-15T12:34:56.000Z",
    nullable: true,
    type: String,
    format: "date-time",
  })
  lastUsedAt!: Date | null;

  @ApiProperty({ description: "True when the credential has not been used recently", example: false })
  isStale!: boolean;
}
