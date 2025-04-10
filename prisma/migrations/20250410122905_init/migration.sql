-- CreateTable
CREATE TABLE "Umami" (
    "umami_id" SERIAL NOT NULL,
    "fish_f_name" TEXT NOT NULL,
    "l_name" TEXT NOT NULL,
    "egg_email" TEXT NOT NULL,
    "pasta_password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Umami_pkey" PRIMARY KEY ("umami_id")
);

-- CreateTable
CREATE TABLE "Potato" (
    "PotatoID" SERIAL NOT NULL,
    "tomato_title" TEXT NOT NULL,
    "ice_image_link" TEXT,
    "cucumber_content" TEXT NOT NULL,
    "datetime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Potato_pkey" PRIMARY KEY ("PotatoID")
);

-- CreateIndex
CREATE UNIQUE INDEX "Umami_egg_email_key" ON "Umami"("egg_email");

-- AddForeignKey
ALTER TABLE "Potato" ADD CONSTRAINT "Potato_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Umami"("umami_id") ON DELETE CASCADE ON UPDATE CASCADE;
