import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FacilityRepository {
  constructor(private prisma: PrismaService) {}

  async findManyByLocalCode(localCode: string) {
    return (await this.prisma.$queryRaw`
      select
        a."businessId",
        a."serialNumber",
        b."name",
        b."cityCode",
        b."cityName",
        b."localCode",
        b."localName",
        b."address",
        b."detailAddress",
        b."owner",
        a."items"
      from (
        select
            f."businessId",
            f."serialNumber",
            string_agg(distinct c."itemName", ',') as "items"
        from "Facility" f join "Course" c
        on f."businessId" = c."businessId" and f."serialNumber" = c."facilitySerialNumber"
        where "localCode" = ${localCode}
        group by f."businessId", f."serialNumber"
      ) a join "Facility" b
        on a."businessId" = b."businessId" and a."serialNumber" = b."serialNumber"
    `) as FacilitiesInfo[];
  }

  async findManyByLocalCodeAndItemName(localCode: string, itemName: string) {
    return (await this.prisma.$queryRaw`
      select distinct
        f."businessId",
        f."serialNumber",
        f."name",
        f."cityCode",
        f."cityName",
        f."localCode",
        f."localName",
        f."address",
        f."detailAddress",
        f."owner",
        ${itemName} as "items"
      from "Facility" f join "Course" c
      on f."businessId" = c."businessId" and f."serialNumber" = c."facilitySerialNumber"
      where "localCode" = ${localCode} and c."itemName" = ${itemName};
    `) as FacilitiesInfo[];
  }

  async findManyByFacilityName(facilityName: string) {
    return (await this.prisma.$queryRaw`
      select
        a."businessId",
        a."serialNumber",
        b."name",
        b."cityCode",
        b."cityName",
        b."localCode",
        b."localName",
        b."address",
        b."detailAddress",
        b."owner",
        a."items"
      from (
        select distinct
          f."businessId",
          f."serialNumber",
          string_agg(distinct c."itemName", ',') as "items"
        from "Facility" f join "Course" c
        on f."businessId" = c."businessId" and f."serialNumber" = c."facilitySerialNumber"
        where f."name" like ${`%${facilityName}%`}
        group by f."businessId", f."serialNumber"
      ) a join "Facility" b
        on a."businessId" = b."businessId" and a."serialNumber" = b."serialNumber";
    `) as FacilitiesInfo[];
  }

  async findManyPopularByLocalCode(localCode: string) {
    const data = (await this.prisma.$queryRaw`
      select
        a."businessId",
        a."serialNumber",
        b."name",
        b."cityCode",
        b."cityName",
        b."localCode",
        b."localName",
        b."address",
        b."detailAddress",
        b."owner",
        a."totalParticipantCount",
        a."items"
      from (
        select
          f."businessId",
          f."serialNumber",
          sum(ch."participantCount") as "totalParticipantCount",
          string_agg(distinct c."itemName", ',') as "items"
        from "Facility" f
          join "Course" c
            on f."businessId" = c."businessId" and f."serialNumber" = c."facilitySerialNumber"
          join "CourseHistory" ch
            on f."businessId" = ch."businessId" and c."courseId" = ch."courseId"
        where "localCode" = ${localCode}
        group by f."businessId", f."serialNumber"
      ) a join "Facility" b
        on a."businessId" = b."businessId" and a."serialNumber" = b."serialNumber"
      order by a."totalParticipantCount" desc
    `) as PopularFacilitiesInfo[];

    return data.map((item) => {
      return {
        ...item,
        totalParticipantCount: Number(item.totalParticipantCount),
      };
    });
  }

  async findManyPopularByLocalCodeAndItemName(
    localCode: string,
    itemName: string,
  ) {
    const data = (await this.prisma.$queryRaw`
      select
        a."businessId",
        a."serialNumber",
        b."name",
        b."cityCode",
        b."cityName",
        b."localCode",
        b."localName",
        b."address",
        b."detailAddress",
        b."owner",
        a."totalParticipantCount",
        a."items"
      from (
        select
          f."businessId",
          f."serialNumber",
          sum(ch."participantCount") as "totalParticipantCount",
          string_agg(distinct c."itemName", ',') as "items"
        from "Facility" f
          join "Course" c
            on f."businessId" = c."businessId" and f."serialNumber" = c."facilitySerialNumber"
          join "CourseHistory" ch
            on f."businessId" = ch."businessId" and c."courseId" = ch."courseId"
        where "localCode" = ${localCode}
        group by f."businessId", f."serialNumber"
      ) a join "Facility" b
        on a."businessId" = b."businessId" and a."serialNumber" = b."serialNumber"
      where a."items" like ${`%${itemName}%`}
      order by a."totalParticipantCount" desc
    `) as PopularFacilitiesInfo[];

    return data.map((item) => {
      return {
        ...item,
        totalParticipantCount: Number(item.totalParticipantCount),
      };
    });
  }

  async findOne(businessId: string, serialNumber: string) {
    return await this.prisma.facility.findUniqueOrThrow({
      where: {
        businessId_serialNumber: {
          businessId,
          serialNumber,
        },
      },
    });
  }

  async toggleFavorite({
    userId,
    businessId,
    serialNumber,
  }: {
    userId: string;
    businessId: string;
    serialNumber: string;
  }) {
    const favorite = await this.prisma.normalFavorite.findUnique({
      where: {
        userId_businessId_serialNumber: {
          userId,
          businessId,
          serialNumber,
        },
      },
    });

    if (favorite) {
      await this.prisma.normalFavorite.delete({
        where: {
          userId_businessId_serialNumber: {
            userId,
            businessId,
            serialNumber,
          },
        },
      });
      return false;
    } else {
      await this.prisma.normalFavorite.create({
        data: {
          userId,
          businessId,
          serialNumber,
        },
      });
      return true;
    }
  }

  async isFavorite({
    userId,
    businessId,
    serialNumber,
  }: {
    userId: string;
    businessId: string;
    serialNumber: string;
  }) {
    const favorite = await this.prisma.normalFavorite.findUnique({
      where: {
        userId_businessId_serialNumber: {
          userId,
          businessId,
          serialNumber,
        },
      },
    });

    return !!favorite;
  }

  async findManyByUserId(userId: string) {
    return (await this.prisma.$queryRaw`
      with "FavoriteFacility" as (
        select * from "NormalFavorite" where "userId" = ${userId}
      )
      select
        a."businessId",
        a."serialNumber",
        b."name",
        b."cityCode",
        b."cityName",
        b."localCode",
        b."localName",
        b."address",
        b."detailAddress",
        b."owner",
        a."items",
        c."createdAt"
      from (
        select distinct
          f."businessId",
          f."serialNumber",
          string_agg(distinct c."itemName", ',') as "items"
        from "Facility" f join "Course" c
        on f."businessId" = c."businessId" and f."serialNumber" = c."facilitySerialNumber"
        where (f."businessId", f."serialNumber") in (select "businessId", "serialNumber" from "FavoriteFacility")
        group by f."businessId", f."serialNumber"
      ) a 
      join "Facility" b
        on a."businessId" = b."businessId" and a."serialNumber" = b."serialNumber"
      join "FavoriteFacility" c
        on a."businessId" = c."businessId" and a."serialNumber" = c."serialNumber";
    `) as FacilitiesInfo[];
  }

  async getFavoriteCount(businessId: string, serialNumber: string) {
    return await this.prisma.normalFavorite.count({
      where: {
        businessId,
        serialNumber,
      },
    });
  }
}

export type FacilitiesInfo = {
  businessId: string;
  serialNumber: string;
  name: string;
  cityCode: string;
  cityName: string;
  localCode: string;
  localName: string;
  address: string;
  detailAddress: string | null;
  owner: string;
  items: string;
  createdAt: Date;
};

export type PopularFacilitiesInfo = {
  businessId: string;
  serialNumber: string;
  name: string;
  cityCode: string;
  cityName: string;
  localCode: string;
  localName: string;
  address: string;
  detailAddress: string | null;
  owner: string;
  totalParticipantCount: number;
  items: string;
};
