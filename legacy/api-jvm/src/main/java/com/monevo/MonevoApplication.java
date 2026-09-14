package com.monevo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class MonevoApplication {

	public static void main(String[] args) {
		SpringApplication.run(MonevoApplication.class, args);
	}
}
