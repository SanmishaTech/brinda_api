import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import dayjs from "dayjs";

export async function generateUsername() {
  const now = dayjs();
  const prefix = now.format("MMYY"); // e.g., 0625

  // Find the latest username that starts with this prefix
  const latest = await prisma.member.findFirst({
    where: {
      username: {
        startsWith: prefix,
      },
    },
    orderBy: {
      username: "desc", // so latest comes first
    },
  });

  let newNumber;

  if (!latest) {
    newNumber = 1;
  } else {
    const lastNumber = parseInt(latest.username.slice(4), 10); // Get the last 4 digits
    newNumber = lastNumber + 1;
  }

  const username = `${prefix}${String(newNumber).padStart(4, "0")}`;
  return username; // e.g., 01250001
}
