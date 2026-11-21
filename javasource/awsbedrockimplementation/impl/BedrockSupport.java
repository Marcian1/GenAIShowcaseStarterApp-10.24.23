package awsbedrockimplementation.impl;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

import com.mendix.core.Core;
import com.mendix.logging.ILogNode;

import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.awscore.exception.AwsServiceException;
import software.amazon.awssdk.http.apache.ApacheHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelRequest;

/**
 * Shared AWS plumbing for the Bedrock actions.
 *
 * - One credentials provider and one Bedrock Runtime client per region are created once and reused
 *   (a client per call leaked HTTP clients and triggered an STS call every time).
 * - Credentials use the default provider chain, which includes the web identity token (IRSA) used on EKS
 *   as well as container credentials (EKS Pod Identity), environment variables and instance profiles.
 * - Logging never contains prompts, responses or the exception stack trace at Info/Error level.
 */
public final class BedrockSupport {

	public static final ILogNode LOG = Core.getLogger("AWSBedrockImplementation");

	private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(10);
	private static final Duration READ_TIMEOUT = Duration.ofSeconds(120);
	private static final Duration CALL_TIMEOUT = Duration.ofSeconds(120);

	/** Same shape as the check in JA_BedrockTestConnection: e.g. eu-central-1, us-gov-west-1. Keeps the region from altering the endpoint host. */
	private static final Pattern REGION_PATTERN = Pattern.compile("^[a-z]{2}(-[a-z]+)+-[0-9]$");

	private static final ConcurrentHashMap<String, BedrockRuntimeClient> RUNTIME_CLIENTS = new ConcurrentHashMap<>();
	private static volatile AwsCredentialsProvider credentials;

	private BedrockSupport() {}

	/** True when the text looks like an AWS region (single place for this check). */
	public static boolean isValidRegion(String region) {
		return region != null && REGION_PATTERN.matcher(region.trim()).matches();
	}

	public static AwsCredentialsProvider credentials() {
		AwsCredentialsProvider c = credentials;
		if (c == null) {
			synchronized (BedrockSupport.class) {
				if (credentials == null) {
					credentials = DefaultCredentialsProvider.builder().build();
				}
				c = credentials;
			}
		}
		return c;
	}

	public static BedrockRuntimeClient runtimeClient(String region) {
		if (region == null || region.isBlank()) {
			throw new IllegalArgumentException("No AWS region is configured for Bedrock.");
		}
		String trimmed = region.trim();
		if (!REGION_PATTERN.matcher(trimmed).matches()) {
			throw new IllegalArgumentException("The AWS region \"" + trimmed + "\" is not a valid AWS region.");
		}
		return RUNTIME_CLIENTS.computeIfAbsent(trimmed, r -> BedrockRuntimeClient.builder()
				.credentialsProvider(credentials())
				.region(Region.of(r))
				.httpClientBuilder(ApacheHttpClient.builder()
						.connectionTimeout(CONNECT_TIMEOUT)
						.socketTimeout(READ_TIMEOUT))
				.overrideConfiguration(ClientOverrideConfiguration.builder()
						.apiCallTimeout(CALL_TIMEOUT)
						.apiCallAttemptTimeout(CALL_TIMEOUT)
						.build())
				.build());
	}

	/**
	 * Invokes a model. guardrailId may be null/blank (no guardrail). The guardrail version is only sent together
	 * with an identifier; a version below 1 means the working draft.
	 */
	public static String invoke(String region, String modelId, String body, String guardrailId, Integer guardrailVersion) {
		InvokeModelRequest.Builder request = InvokeModelRequest.builder()
				.modelId(modelId)
				.body(SdkBytes.fromUtf8String(body));
		if (guardrailId != null && !guardrailId.isBlank()) {
			request.guardrailIdentifier(guardrailId.trim());
			request.guardrailVersion(guardrailVersion != null && guardrailVersion > 0 ? guardrailVersion.toString() : "DRAFT");
		}
		LOG.debug("InvokeModel model=" + modelId + " region=" + region + " requestChars=" + (body == null ? 0 : body.length()));
		try {
			return runtimeClient(region).invokeModel(request.build()).body().asUtf8String();
		} catch (AwsServiceException e) {
			String code = e.awsErrorDetails() == null ? "unknown" : e.awsErrorDetails().errorCode();
			String msg = e.awsErrorDetails() == null ? e.getMessage() : e.awsErrorDetails().errorMessage();
			LOG.error("Bedrock InvokeModel failed: model=" + modelId + ", region=" + region + ", http=" + e.statusCode()
					+ ", code=" + code + ", requestId=" + e.requestId());
			LOG.debug("Bedrock InvokeModel failure detail", e);
			throw new RuntimeException("Bedrock InvokeModel failed for " + modelId + " (HTTP " + e.statusCode() + ", " + code
					+ ", request id " + e.requestId() + "): " + msg);
		} catch (SdkException e) {
			LOG.error("Bedrock InvokeModel could not be completed: model=" + modelId + ", region=" + region + ", "
					+ e.getClass().getSimpleName());
			LOG.debug("Bedrock InvokeModel failure detail", e);
			throw new RuntimeException("Bedrock InvokeModel could not be completed for " + modelId + ": " + e.getMessage());
		}
	}
}
