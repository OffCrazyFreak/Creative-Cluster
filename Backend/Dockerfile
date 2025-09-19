# Use the official Maven image as the base image for dependency resolution
FROM maven:3.8.5-openjdk-17-slim AS builder

# Set the working directory
WORKDIR /app

# Copy only the Maven files first to leverage caching for dependencies
COPY pom.xml mvnw* .
COPY .mvn .mvn

# Download dependencies (offline) to cache them in the layer
RUN mvn dependency:go-offline -B

# Copy the rest of the source and build
COPY src ./src
RUN mvn clean package -DskipTests -B

# Use a lightweight runtime image
FROM eclipse-temurin:17-jdk-jammy

WORKDIR /app

# Copy the produced jar - pick the first JAR in target matching the artifact
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
