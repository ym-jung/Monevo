plugins {
    java
    id("com.diffplug.spotless") version "8.10.1"
    id("org.springframework.boot") version "4.1.1"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.monevo"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

val lombokVersion = "1.18.48"

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")

    implementation("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server")

    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("org.springframework.boot:spring-boot-flyway")
    runtimeOnly("org.postgresql:postgresql:42.7.13")

    implementation("com.github.f4b6a3:uuid-creator:6.1.1")

    implementation("com.github.ben-manes.caffeine:caffeine")
    implementation("org.springframework:spring-context-support")

    implementation("com.bucket4j:bucket4j_jdk17-core:8.19.0")

    implementation("net.logstash.logback:logstash-logback-encoder:9.0")

    compileOnly("org.projectlombok:lombok:$lombokVersion")
    annotationProcessor("org.projectlombok:lombok:$lombokVersion")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.boot:spring-boot-security-test")
    testImplementation("org.springframework.boot:spring-boot-resttestclient")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")
    testCompileOnly("org.projectlombok:lombok:$lombokVersion")
    testAnnotationProcessor("org.projectlombok:lombok:$lombokVersion")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

spotless {
    java {
        target("src/*/java/**/*.java")
        importOrder("", "javax", "java", "\\#")
        removeUnusedImports()
        trimTrailingWhitespace()
        endWithNewline()
        leadingSpacesToTabs()
    }
}
