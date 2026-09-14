package com.celanworksmith.demoactionserver;

import com.fasterxml.jackson.databind.DeserializationFeature;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;

@SpringBootApplication(scanBasePackages = "com.celanworksmith.demoactionserver")
public class DemoActionServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoActionServerApplication.class, args);
    }

    @Bean
    Jackson2ObjectMapperBuilderCustomizer decimalJsonNumbers() {
        return builder -> builder.featuresToEnable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS);
    }
}
