/**
 * @packageDocumentation
 * @module Screens
 */

import React, { useState, useEffect, useCallback, ComponentType } from 'react';

// Nav
import { useNavigation, useRoute } from '@react-navigation/native';

// Screens
import { Eula as EulaScreen } from '../subScreens/Eula';
import { CreatePassword as CreatePasswordScreen } from '../subScreens/CreatePassword';
import {
    AccountDetails as AccountDetailsScreen,
    AccountDetailInformation,
    emptyAccountDetailInformation,
} from '../subScreens/AccountDetails';
import { RegistrationComplete } from '../subScreens/RegistrationComplete';
import { ExistingAccountComplete } from '../subScreens/ExistingAccountComplete';

// Components
import { View, StyleSheet, SafeAreaView, BackHandler } from 'react-native';
import { useTheme } from 'react-native-paper';
import ViewPager from '@react-native-community/viewpager';
import { CloseHeader } from '../components/CloseHeader';
import { PageIndicator } from '../components/PageIndicator';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Spinner } from '../components/Spinner';
import { SimpleDialog } from '../components/SimpleDialog';
import { ErrorState } from '../components/ErrorState';
import { ToggleButton } from '../components/ToggleButton';
import i18n from '../translations/i18n';

// Styles
import * as Colors from '@pxblue/colors';

// Shared Auth Logic
import {
    // Actions
    RegistrationActions,
    useRegistrationUIState,
    useRegistrationUIActions,
    // Hooks
    useLanguageLocale,
    useInjectedUIContext,
    AccountDetailsFormProps,
    CustomAccountDetails,
} from '@pxblue/react-auth-shared';
import { CustomRegistrationDetailsGroup, RegistrationPage } from '../types';

/**
 * @ignore
 */
const makeContainerStyles = (theme: ReactNativePaper.Theme): Record<string, any> =>
    StyleSheet.create({
        safeContainer: {
            height: '100%',
            backgroundColor: theme.colors.surface,
        },
        mainContainer: {
            flex: 1,
        },
        containerMargins: {
            marginHorizontal: 20,
        },
        fullFlex: {
            flex: 1,
            height: '100%',
        },
        topBorder: {
            borderTopColor: Colors.gray['200'],
            borderTopWidth: StyleSheet.hairlineWidth,
        },
        spaceBetween: {
            flexGrow: 1,
            justifyContent: 'space-between',
        },
    });

/**
 * @ignore
 */
const makeStyles = (): Record<string, any> =>
    StyleSheet.create({
        sideBySideButtons: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 10,
        },
        wideButton: {
            width: '100%',
            alignSelf: 'flex-end',
        },
    });

/**
 * Type for the properties of [[InviteRegistrationPager]].
 *
 * @param code Token from an email deep link for verifying a request to create an account with a specific email.
 * @param email (Optional) Email associated with the code `?email=addr%40domain.com`.
 */
type InviteRegistrationPagerParams = {
    code: string;
    email?: string;
};

/**
 * @param theme (Optional) react-native-paper theme partial to style the component.
 */
type InviteRegistrationPagerProps = {
    theme?: ReactNativePaper.Theme;
};

/**
 * Pager controlling the user registration via invitation screen flow.
 *
 * @category Component
 */
export const InviteRegistrationPager: React.FC<InviteRegistrationPagerProps> = (props) => {
    const { t } = useLanguageLocale();
    const navigation = useNavigation();
    const registrationState = useRegistrationUIState();
    const registrationActions = useRegistrationUIActions();
    const injectedUIContext = useInjectedUIContext();
    const theme = useTheme(props.theme);

    // Styling
    const containerStyles = makeContainerStyles(theme);
    const styles = makeStyles();

    const [hasAcknowledgedError, setHasAcknowledgedError] = useState(false);

    const [eulaAccepted, setEulaAccepted] = useState(false);
    const [password, setPassword] = useState('');
    const [accountDetails, setAccountDetails] = useState<AccountDetailInformation | null>(null);
    const [customAccountDetails, setCustomAccountDetails] = useState<CustomRegistrationDetailsGroup | null>({});
    const [eulaContent, setEulaContent] = useState<string>();
    const [currentPage, setCurrentPage] = useState(0);
    const [accountAlreadyExists, setAccountAlreadyExists] = React.useState<boolean>(false);

    const viewPager = React.createRef<ViewPager>();

    const route = useRoute();
    const routeParams = route.params as InviteRegistrationPagerParams;
    const validationCode = routeParams?.code ?? 'NoCodeEntered';
    const validationEmail = routeParams?.email;

    // Reset registration and validation state on dismissal
    useEffect(
        () => (): void => {
            registrationActions.dispatch(RegistrationActions.registerUserReset());
            registrationActions.dispatch(RegistrationActions.validateUserRegistrationReset());
        },
        [] // eslint-disable-line react-hooks/exhaustive-deps
    );

    // Network state (registration)
    const registrationTransit = registrationState.inviteRegistration.registrationTransit;
    const registrationIsInTransit = registrationTransit.transitInProgress;
    const hasRegistrationTransitError = registrationTransit.transitErrorMessage !== null;
    const registrationTransitErrorMessage = registrationTransit.transitErrorMessage ?? t('MESSAGES.REQUEST_ERROR');
    const registrationSuccess = registrationState.inviteRegistration.registrationTransit.transitSuccess;

    // Network state (invite code validation)
    const isValidationInTransit = registrationState.inviteRegistration.validationTransit.transitInProgress;
    const validationTransitErrorMessage = registrationState.inviteRegistration.validationTransit.transitErrorMessage;
    const validationSuccess = registrationState.inviteRegistration.validationTransit.transitSuccess;
    const validationComplete = registrationState.inviteRegistration.validationTransit.transitComplete;

    // Network state (loading eula)
    const loadEulaTransitErrorMessage = registrationState.eulaTransit.transitErrorMessage;

    const loadAndCacheEula = async (): Promise<void> => {
        if (!eulaContent) {
            try {
                const eulaText = await registrationActions.actions.loadEULA(i18n.language);
                setEulaContent(eulaText);
            } catch {
                // do nothing
            }
        }
    };

    // Page Definitions
    const customDetails = injectedUIContext.customAccountDetails || [];
    const FirstCustomPage: ComponentType<AccountDetailsFormProps> | null =
        customDetails.length > 0 ? customDetails[0] : null;
    const RegistrationPages: RegistrationPage[] = [
        {
            name: 'Eula',
            pageTitle: t('REGISTRATION.STEPS.LICENSE'),
            pageBody: (
                <EulaScreen
                    key={'EulaPage'}
                    eulaAccepted={eulaAccepted}
                    onEulaChanged={setEulaAccepted}
                    loadEula={loadAndCacheEula}
                    htmlEula={injectedUIContext.htmlEula ?? false}
                    eulaError={loadEulaTransitErrorMessage}
                    eulaContent={eulaContent}
                />
            ),
            canGoForward: eulaAccepted,
            canGoBack: false,
        },
        {
            name: 'CreatePassword',
            pageTitle: t('REGISTRATION.STEPS.PASSWORD'),
            pageBody: (
                <KeyboardAwareScrollView key={'CreatePasswordPage'} contentContainerStyle={[containerStyles.fullFlex]}>
                    <CreatePasswordScreen onPasswordChanged={setPassword} />
                </KeyboardAwareScrollView>
            ),
            canGoForward: password.length > 0,
            canGoBack: true,
        },
        {
            name: 'AccountDetails',
            pageTitle: t('REGISTRATION.STEPS.ACCOUNT_DETAILS'),
            pageBody: (
                <AccountDetailsScreen key={'AccountDetailsScreen'} onDetailsChanged={setAccountDetails}>
                    {FirstCustomPage && <FirstCustomPage onDetailsChanged={(): void => {}} />}
                </AccountDetailsScreen>
            ),
            canGoForward: accountDetails !== null, // &&
            // accountDetails.valid,
            canGoBack: true,
        },
    ]
        .concat(
            // Custom injected pages
            customDetails
                .slice(1)
                // @ts-ignore there won't be any more nulls
                .filter((item: ComponentType<AccountDetailsFormProps>) => item !== null)
                // @ts-ignore there won't be any nulls at this point
                .map((page: ComponentType<AccountDetailsFormProps>, i: number) => {
                    const PageComponent = page;
                    return {
                        name: `CustomPage${i + 1}`,
                        pageTitle: t('REGISTRATION.STEPS.ACCOUNT_DETAILS'),
                        pageBody: (
                            // <AccountDetailsWrapper>
                            <PageComponent
                                key={`CustomDetailsPage_${i + 1}`}
                                // @ts-ignore
                                onDetailsChanged={(details: CustomAccountDetails, valid: boolean): void => {
                                    setCustomAccountDetails({
                                        ...customAccountDetails,
                                        [i + 1]: { values: details, valid },
                                    });
                                }}
                                // @ts-ignore
                                initialDetails={customAccountDetails[i + 1]?.values}
                                onSubmit={
                                    /* eslint-disable @typescript-eslint/no-use-before-define */
                                    // @ts-ignore
                                    customAccountDetails[i + 1]?.valid ? (): void => advancePage(1) : undefined
                                    /* eslint-enable @typescript-eslint/no-use-before-define */
                                }
                            />
                            // </AccountDetailsWrapper>
                        ),
                        canGoForward: true, //customAccountDetails[i + 1]?.valid,
                        canGoBack: true,
                    };
                })
        )
        .concat([
            {
                name: 'Complete',
                pageTitle: t('REGISTRATION.STEPS.COMPLETE'),
                pageBody: (
                    <RegistrationComplete
                        key={'CompletePage'}
                        firstName={accountDetails?.firstName ?? ''}
                        lastName={accountDetails?.lastName ?? ''}
                        email={registrationState.inviteRegistration.email ?? t('REGISTRATION.UNKNOWN_EMAIL')}
                        organization={
                            registrationState.inviteRegistration.organizationName ??
                            t('REGISTRATION.UNKNOWN_ORGANIZATION')
                        }
                    />
                ),
                canGoForward: true,
                canGoBack: false,
            },
        ]);
    const isLastStep = currentPage === RegistrationPages.length - 1;
    const isFirstStep = currentPage === 0;
    const CompletePage = RegistrationPages.length - 1;

    useEffect(() => {
        if (currentPage === RegistrationPages.length - 2 && registrationSuccess) {
            setCurrentPage(CompletePage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registrationSuccess]);

    const validateCode = useCallback(async (): Promise<void> => {
        setHasAcknowledgedError(false);
        try {
            const registrationComplete = await registrationActions.actions.validateUserRegistrationRequest(
                validationCode,
                validationEmail
            );
            if (registrationComplete) {
                setAccountAlreadyExists(true);
            }
        } catch {
            // do nothing
        }
    }, [setHasAcknowledgedError, registrationActions, validationCode, validationEmail, setAccountAlreadyExists]);

    useEffect(() => {
        if (!isValidationInTransit && !validationComplete && validationCode.length > 0) {
            void validateCode();
        }
    }, [registrationState.inviteRegistration.validationTransit, validationCode, validateCode, validationEmail]); // eslint-disable-line react-hooks/exhaustive-deps

    // Spinner - shows if either of registration of code validation are in progress
    const spinner = registrationIsInTransit || isValidationInTransit ? <Spinner /> : <></>;

    // View pager
    useEffect(() => {
        if (viewPager && viewPager.current) {
            if (currentPage === CompletePage) {
                viewPager.current.setPageWithoutAnimation(currentPage);
            } else {
                viewPager.current.setPage(currentPage);
            }
        }
    }, [currentPage, viewPager, registrationSuccess, CompletePage]);

    const errorDialog = (
        <SimpleDialog
            title={t('MESSAGES.ERROR')}
            bodyText={t(registrationTransitErrorMessage)}
            visible={hasRegistrationTransitError && !hasAcknowledgedError}
            onDismiss={(): void => {
                setHasAcknowledgedError(true);
            }}
        />
    );

    const attemptRegistration = useCallback(async (): Promise<void> => {
        setHasAcknowledgedError(false);

        let flattenedDetails = {};
        Object.keys(customAccountDetails || {}).forEach((key) => {
            flattenedDetails = { ...flattenedDetails, ...(customAccountDetails || {})[parseInt(key, 10)].values };
        });

        try {
            await registrationActions.actions.completeRegistration(
                {
                    password: password,
                    accountDetails: { ...(accountDetails ?? emptyAccountDetailInformation), ...flattenedDetails },
                },
                validationCode,
                validationEmail
            );
        } catch {
            // do nothing
        }
    }, [
        registrationActions,
        setHasAcknowledgedError,
        accountDetails,
        customAccountDetails,
        password,
        validationCode,
        validationEmail,
    ]);

    // Screen transition logic
    const canProgress = useCallback((): boolean => RegistrationPages[currentPage].canGoForward ?? false, [
        RegistrationPages,
        currentPage,
    ]);
    const canGoBackProgress = useCallback((): boolean => RegistrationPages[currentPage].canGoBack ?? true, [
        RegistrationPages,
        currentPage,
    ]);

    const advancePage = useCallback(
        (delta = 0): void => {
            if (delta === 0) {
                return;
            } else if (isFirstStep && delta < 0) {
                navigation.navigate('Login');
            } else if (isLastStep && delta > 0) {
                navigation.navigate('Login');
            } else {
                // If this is the last user-entry step of the invite flow, it is time to make a network call
                // Check > 0 so advancing backwards does not risk going into the completion block
                if (
                    currentPage === RegistrationPages.length - 2 &&
                    !registrationSuccess &&
                    canProgress() &&
                    delta > 0
                ) {
                    void attemptRegistration();
                } else {
                    setCurrentPage(currentPage + (delta as number));
                }
            }
        },
        [
            navigation,
            RegistrationPages,
            currentPage,
            canProgress,
            attemptRegistration,
            setCurrentPage,
            isFirstStep,
            isLastStep,
            registrationSuccess,
        ]
    );

    const backLogic = useCallback((): void => {
        if (isFirstStep) {
            navigation.navigate('Login');
        } else if (canGoBackProgress()) {
            advancePage(-1);
        } else if (isLastStep) {
            navigation.navigate('Login');
        }
    }, [navigation, isFirstStep, isLastStep, advancePage, canGoBackProgress]);

    const pageTitle = (): string => {
        if (isValidationInTransit) {
            return t('MESSAGES.LOADING');
        } else if (validationTransitErrorMessage !== null) {
            return t('MESSAGES.ERROR');
        }
        return RegistrationPages[currentPage].pageTitle || '';
    };

    // Navigate appropriately with the hardware back button on android
    useEffect(() => {
        const onBackPress = (): boolean => {
            backLogic();
            return true;
        };

        BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return (): void => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [currentPage, isFirstStep, isLastStep, navigation, backLogic]);

    let buttonArea: JSX.Element;
    if (isLastStep) {
        buttonArea = (
            <View style={[styles.sideBySideButtons, containerStyles.containerMargins]}>
                <ToggleButton
                    text={t('ACTIONS.CONTINUE')}
                    style={{ width: '100%', alignSelf: 'flex-end' }}
                    onPress={(): void => advancePage(1)}
                />
            </View>
        );
    } else {
        buttonArea = (
            <View style={containerStyles.topBorder}>
                <View style={[styles.sideBySideButtons, containerStyles.containerMargins]}>
                    <View style={{ flex: 1 }}>
                        <ToggleButton
                            text={t('ACTIONS.BACK')}
                            style={{ width: 100, alignSelf: 'flex-start' }}
                            outlined={true}
                            disabled={!canGoBackProgress()}
                            onPress={(): void => advancePage(-1)}
                        />
                    </View>
                    <PageIndicator currentPage={currentPage} totalPages={RegistrationPages.length} />
                    <View style={{ flex: 1 }}>
                        <ToggleButton
                            text={t('ACTIONS.NEXT')}
                            style={{ width: 100, alignSelf: 'flex-end' }}
                            disabled={!canProgress()}
                            onPress={(): void => advancePage(1)}
                        />
                    </View>
                </View>
            </View>
        );
    }
    return !accountAlreadyExists && validationSuccess && !isValidationInTransit ? (
        <View style={{ flex: 1 }}>
            {spinner}
            {errorDialog}

            <CloseHeader title={pageTitle()} backAction={(): void => navigation.navigate('Login')} />
            <SafeAreaView style={[containerStyles.spaceBetween, { backgroundColor: theme.colors.surface }]}>
                <ViewPager
                    ref={viewPager}
                    initialPage={0}
                    scrollEnabled={false}
                    transitionStyle="scroll"
                    style={{ flex: 1 }}
                >
                    {RegistrationPages.map((page) => page.pageBody)}
                </ViewPager>
                {buttonArea}
            </SafeAreaView>
        </View>
    ) : accountAlreadyExists ? (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <CloseHeader
                title={t('REGISTRATION.STEPS.COMPLETE')}
                backAction={(): void => navigation.navigate('Login')}
            />
            <SafeAreaView style={[containerStyles.safeContainer, { flex: 1 }]}>
                <View style={{ flex: 1 }}>
                    <ExistingAccountComplete />
                </View>
                <View style={[styles.sideBySideButtons, containerStyles.containerMargins]}>
                    <ToggleButton
                        text={t('ACTIONS.CONTINUE')}
                        style={{ width: '100%', alignSelf: 'flex-end' }}
                        onPress={(): void => navigation.navigate('Login')}
                    />
                </View>
            </SafeAreaView>
        </View>
    ) : !validationComplete ? (
        <View style={{ flex: 1 }}>
            <CloseHeader title={pageTitle()} backAction={(): void => navigation.navigate('Login')} />
            <Spinner />
        </View>
    ) : (
        <View style={{ flex: 1 }}>
            <CloseHeader title={pageTitle()} backAction={(): void => navigation.navigate('Login')} />
            <ErrorState
                title={t('MESSAGES.FAILURE')}
                bodyText={validationTransitErrorMessage}
                onPress={(): void => {
                    navigation.navigate('Login');
                }}
            />
        </View>
    );
};
