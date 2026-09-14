package com.monevo.common.util;

import ch.qos.logback.classic.spi.ILoggingEvent;
import net.logstash.logback.composite.loggingevent.MessageJsonProvider;
import tools.jackson.core.JsonGenerator;

public class MaskingMessageJsonProvider extends MessageJsonProvider {

	@Override
	public void writeTo(JsonGenerator generator, ILoggingEvent event) {
		generator.writeStringProperty(getFieldName(), LogMasking.maskEmails(event.getFormattedMessage()));
	}
}
