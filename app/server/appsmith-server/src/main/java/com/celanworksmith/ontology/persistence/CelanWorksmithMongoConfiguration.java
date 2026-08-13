package com.celanworksmith.ontology.persistence;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(CelanWorksmithMongoProperties.class)
public class CelanWorksmithMongoConfiguration {}
