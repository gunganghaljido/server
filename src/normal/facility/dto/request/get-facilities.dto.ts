import { IsString, IsOptional } from 'class-validator';

export class GetFacilitiesDto {
  @IsOptional()
  @IsString()
  localCode?: string;

  @IsOptional()
  @IsString()
  itemName?: string;

  @IsOptional()
  @IsString()
  facilityName?: string;
}
