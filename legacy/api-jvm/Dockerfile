# syntax=docker/dockerfile:1

FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /build

COPY gradlew ./
COPY gradle gradle
COPY settings.gradle.kts build.gradle.kts ./
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies --quiet || true

COPY src src
RUN ./gradlew --no-daemon bootJar -x test

FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app

RUN groupadd --gid 1000 monevo \
 && useradd --uid 1000 --gid 1000 --create-home --shell /usr/sbin/nologin monevo

COPY --from=build --chown=monevo:monevo /build/build/libs/*.jar /app/app.jar

USER monevo
EXPOSE 8080

ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseG1GC -Duser.timezone=UTC"

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
