package com.celanworksmith.demoactionserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.celanworksmith.demoactionserver")
public class DemoActionServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoActionServerApplication.class, args);
    }
}
